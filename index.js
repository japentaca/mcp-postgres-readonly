#!/usr/bin/env node

/**
 * MCP Server para PostgreSQL
 * 
 * Este servidor MCP permite acceso seguro a bases de datos PostgreSQL
 * utilizando solo consultas SELECT para máxima seguridad.
 */

import dotenv from 'dotenv';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import pkg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
const { Client } = pkg;

// Obtener el directorio actual del archivo
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache para almacenar configuraciones de proyectos
const configCache = new Map();

/**
 * Cargar la configuración de PostgreSQL desde el .env del proyecto actual
 * @param {string} projectPath - Ruta del proyecto actual
 * @returns {string} Connection string o null si no encuentra
 */
function loadProjectConfig(projectPath) {
  const cacheKey = projectPath;

  // Verificar si ya está en cache
  if (configCache.has(cacheKey)) {
    const cached = configCache.get(cacheKey);
    if (cached.timestamp > Date.now() - 5000) { // Cache válido por 5 segundos
      return cached.connectionString;
    }
  }

  const envPath = path.join(projectPath, '.env');
  console.error(`🔍 Buscando configuración PostgreSQL en: ${envPath}`);

  if (fs.existsSync(envPath)) {
    try {
      const result = dotenv.config({ path: envPath, override: false });
      const connectionString = result.parsed?.MCP_PG_CONNSTR || process.env.MCP_PG_CONNSTR;

      if (connectionString) {
        console.error(`✅ Configuración cargada desde: ${envPath}`);
        configCache.set(cacheKey, {
          connectionString,
          timestamp: Date.now()
        });
        return connectionString;
      }
    } catch (error) {
      console.error(`⚠️ Error leyendo ${envPath}: ${error.message}`);
    }
  }

  console.error(`❌ No se encontró MCP_PG_CONNSTR en ${envPath}`);
  return null;
}

/**
 * Obtener la conexión actual basada en el directorio de trabajo
 * @returns {string} Connection string
 */
function getConnectionString() {
  const cwd = process.cwd();
  const connectionString = loadProjectConfig(cwd);

  if (!connectionString) {
    throw new Error(
      `MCP_PG_CONNSTR no configurada en ${cwd}/.env\n` +
      `Crea un archivo .env en la raíz del proyecto con:\n` +
      `MCP_PG_CONNSTR=postgresql://usuario:contraseña@localhost:5432/basededatos`
    );
  }

  return connectionString;
}

// Crear instancia del servidor MCP
const server = new Server({
  name: 'postgresql-mcp-server',
  version: '1.0.0'
}, {
  capabilities: {
    tools: {}
  }
});

/**
 * Validar que una consulta SQL sea solo SELECT
 */
function isValidSelectQuery(query) {
  const cleanQuery = query.trim().replace(/^--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

  if (cleanQuery.length === 0) {
    return false;
  }

  const upperQuery = cleanQuery.toUpperCase();
  const forbiddenKeywords = [
    'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
    'TRUNCATE', 'GRANT', 'REVOKE', 'EXECUTE', 'CALL'
  ];

  return upperQuery.startsWith('SELECT') &&
    !forbiddenKeywords.some(keyword => upperQuery.includes(keyword));
}

/**
 * Ejecutar consulta PostgreSQL
 */
async function executeQuery(query, params = []) {
  if (!isValidSelectQuery(query)) {
    throw new Error('Solo se permiten consultas SELECT por seguridad');
  }

  const connectionString = getConnectionString();

  const client = new Client({
    connectionString: connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.error(`Ejecutando consulta: ${query.substring(0, 100)}${query.length > 100 ? '...' : ''}`);

    const result = await client.query(query, params);

    return {
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields?.map(field => ({
        name: field.name,
        dataTypeID: field.dataTypeID
      })) || []
    };
  } catch (error) {
    console.error('Error ejecutando consulta:', error.message);
    throw new Error(`Error en la base de datos: ${error.message}`);
  } finally {
    await client.end();
  }
}

// Registrar handler para listar herramientas - estructura exacta del API Tester
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "execute_select_query",
        description: "Ejecuta una consulta SELECT personalizada en la base de datos PostgreSQL",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "La consulta SELECT a ejecutar (solo se permiten comandos SELECT)"
            },
            params: {
              description: "Parámetros opcionales para la consulta preparada como array"
            }
          },
          required: ["query"]
        }
      },
      {
        name: "list_tables",
        description: "Obtiene una lista de todas las tablas disponibles en la base de datos",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "describe_table",
        description: "Obtiene información detallada sobre las columnas de una tabla específica",
        inputSchema: {
          type: "object",
          properties: {
            table_name: {
              type: "string",
              description: "Nombre de la tabla a describir"
            },
            schema_name: {
              type: "string",
              description: "Nombre del esquema (por defecto: public)"
            }
          },
          required: ["table_name"]
        }
      },
      {
        name: "execute_common_queries",
        description: "Ejecuta consultas predefinidas comunes para explorar la base de datos",
        inputSchema: {
          type: "object",
          properties: {
            query_type: {
              type: "string",
              enum: ["database_version", "current_user", "current_database", "table_sizes"],
              description: "Tipo de consulta común a ejecutar"
            }
          },
          required: ["query_type"]
        }
      }
    ]
  };
});

// Registrar handler para ejecutar herramientas - estructura exacta del API Tester
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "execute_select_query": {
        const { query, params = [] } = args;
        const result = await executeQuery(query, params);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              tool: "execute_select_query",
              query: query,
              rowCount: result.rowCount,
              rows: result.rows,
              fields: result.fields
            }, null, 2)
          }]
        };
      }

      case "list_tables": {
        const query = `
          SELECT 
            schemaname,
            tablename,
            tableowner
          FROM pg_tables 
          WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
          ORDER BY schemaname, tablename;
        `;

        const result = await executeQuery(query);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              tool: "list_tables",
              tableCount: result.rowCount,
              tables: result.rows
            }, null, 2)
          }]
        };
      }

      case "describe_table": {
        const { table_name, schema_name = 'public' } = args;

        const query = `
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length,
            numeric_precision,
            numeric_scale
          FROM information_schema.columns 
          WHERE table_schema = $1 AND table_name = $2
          ORDER BY ordinal_position;
        `;

        const result = await executeQuery(query, [schema_name, table_name]);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              tool: "describe_table",
              table: `${schema_name}.${table_name}`,
              columnCount: result.rowCount,
              columns: result.rows
            }, null, 2)
          }]
        };
      }

      case "execute_common_queries": {
        const { query_type } = args;

        let query;
        switch (query_type) {
          case 'database_version':
            query = 'SELECT version() as version;';
            break;
          case 'current_user':
            query = 'SELECT current_user as username;';
            break;
          case 'current_database':
            query = 'SELECT current_database() as database_name;';
            break;
          case 'table_sizes':
            query = `
              SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
              FROM pg_tables 
              WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
              ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
            `;
            break;
          default:
            throw new Error(`Tipo de consulta no soportado: ${query_type}`);
        }

        const result = await executeQuery(query);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              tool: "execute_common_queries",
              query_type: query_type,
              rowCount: result.rowCount,
              rows: result.rows
            }, null, 2)
          }]
        };
      } default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: false,
          error: error.message,
          tool: name
        }, null, 2)
      }],
      isError: true
    };
  }
});

// Función principal para iniciar el servidor
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("PostgreSQL MCP server running on stdio");
}

// Manejo de cierre del servidor
process.on('SIGINT', () => {
  console.error('\\n🛑 Cerrando servidor MCP PostgreSQL...');
  process.exit(0);
});

// Manejo de cierre graceful
process.on('SIGINT', () => {
  console.error("Shutting down PostgreSQL MCP server...");
  process.exit(0);
});

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});