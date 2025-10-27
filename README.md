# MCP PostgreSQL Server

Un servidor MCP (Model Context Protocol) seguro para acceder a bases de datos PostgreSQL que solo permite consultas SELECT.

## 🚀 Características

- ✅ **Solo consultas SELECT**: Máxima seguridad, no permite INSERT, UPDATE, DELETE u otras operaciones peligrosas
- ✅ **Configuración desde el proyecto**: Lee la cadena de conexión desde `MCP_PG_CONNSTR` en el archivo `.env` **del proyecto que está siendo editado** (no del servidor MCP)
- ✅ **JavaScript puro**: No requiere TypeScript ni compilación
- ✅ **Manejo robusto de errores**: Logging apropiado y manejo de errores de conexión
- ✅ **Múltiples herramientas útiles**: Exploración de esquemas, listado de tablas, y consultas comunes

## 📁 Concepto importante: Separación de configuración

Este servidor MCP funciona de manera diferente a una aplicación normal:

```
📂 Tu proyecto (donde trabajas)
├── 📄 .env                    ← Aquí va MCP_PG_CONNSTR
├── 📂 src/
├── 📄 package.json
└── 📄 README.md

📂 Servidor MCP (instalado por separado)
├── 📄 index.js               ← El servidor MCP
├── 📄 package.json
└── 📄 README.md
```

**¿Por qué es así?**
- El servidor MCP es una **herramienta externa** que se conecta a tu proyecto
- Cada proyecto puede tener su propia base de datos (diferente conexión)
- El servidor MCP **lee automáticamente** el `.env` de **tu proyecto actual**
- No necesitas configurar nada en el servidor MCP, solo en tu proyecto

## 📋 Requisitos previos

- Node.js 18 o superior
- Una base de datos PostgreSQL accesible
- Acceso de lectura a la base de datos

## 🛠️ Instalación

1. **Clona o descarga el proyecto**:
```bash
git clone <repository-url>
cd postgres
```

2. **Instala las dependencias**:
```bash
npm install
```

3. **Configura las variables de entorno EN EL PROYECTO QUE ESTÁS EDITANDO**:

⚠️ **IMPORTANTE**: El archivo `.env` debe estar en la **raíz del proyecto que estás editando**, NO en la carpeta del servidor MCP.

En la raíz de tu proyecto (donde tienes tu código fuente), crea un archivo `.env`:

```bash
# En la raíz de tu proyecto (no en la carpeta del servidor MCP)
MCP_PG_CONNSTR=postgresql://usuario:contraseña@localhost:5432/basededatos
```

**Ejemplo de estructura**:
```
mi-proyecto/              ← Tu proyecto
├── .env                  ← Aquí va el archivo .env
├── src/
├── package.json
└── ...

mcp-postgres-server/      ← Servidor MCP (separado)
├── index.js
├── package.json
└── ...
```

## 🚀 Uso

### Ejecución del servidor

```bash
# Modo normal
npm start

# Modo desarrollo (con reinicio automático)
npm run dev
```

### Configuración en Claude Desktop

Para usar este servidor con Claude Desktop, agrega la siguiente configuración a tu archivo `claude_desktop_config.json`:

#### Windows:
```json
{
  "mcpServers": {
    "postgresql": {
      "command": "node",
      "args": ["C:\\ruta\\completa\\hacia\\postgres\\index.js"],
      "cwd": "C:\\ruta\\completa\\hacia\\postgres"
    }
  }
}
```

#### macOS/Linux:
```json
{
  "mcpServers": {
    "postgresql": {
      "command": "node",
      "args": ["/ruta/completa/hacia/postgres/index.js"],
      "cwd": "/ruta/completa/hacia/postgres"
    }
  }
}
```

### Ubicación del archivo de configuración:

- **Windows**: `%APPDATA%\\Claude\\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

## 🔧 Herramientas disponibles

### 1. `execute_select_query`
Ejecuta consultas SELECT personalizadas.

**Parámetros**:
- `query` (string): La consulta SELECT a ejecutar
- `params` (array, opcional): Parámetros para consultas preparadas

**Ejemplo**:
```sql
SELECT * FROM usuarios WHERE edad > $1 ORDER BY nombre;
```

### 2. `list_tables`
Lista todas las tablas disponibles en la base de datos.

**Parámetros**: Ninguno

### 3. `describe_table`
Obtiene información detallada sobre las columnas de una tabla.

**Parámetros**:
- `table_name` (string): Nombre de la tabla
- `schema_name` (string, opcional): Nombre del esquema (por defecto: 'public')

### 4. `execute_common_queries`
Ejecuta consultas predefinidas útiles.

**Parámetros**:
- `query_type` (string): Uno de:
  - `database_version`: Versión de PostgreSQL
  - `current_user`: Usuario actual
  - `current_database`: Base de datos actual
  - `table_sizes`: Tamaños de las tablas

## 🔒 Seguridad

Este servidor implementa múltiples capas de seguridad:

1. **Validación de consultas**: Solo permite comandos SELECT
2. **Filtrado de patrones peligrosos**: Bloquea INSERT, UPDATE, DELETE, DROP, etc.
3. **Consultas preparadas**: Soporte para parámetros seguros
4. **Conexiones seguras**: Soporte SSL para conexiones en producción

### Consultas permitidas ✅
```sql
SELECT * FROM usuarios;
SELECT COUNT(*) FROM pedidos WHERE fecha > '2024-01-01';
SELECT u.nombre, p.total FROM usuarios u JOIN pedidos p ON u.id = p.usuario_id;
```

### Consultas bloqueadas ❌
```sql
INSERT INTO usuarios (nombre) VALUES ('nuevo');
UPDATE usuarios SET email = 'nuevo@email.com';
DELETE FROM usuarios WHERE id = 1;
DROP TABLE usuarios;
```

## 🌍 Variables de entorno

⚠️ **Ubicación importante**: Estas variables deben estar en el archivo `.env` en la **raíz del proyecto que estás editando**, no en la carpeta del servidor MCP.

| Variable | Descripción | Ubicación | Ejemplo |
|----------|-------------|-----------|---------|
| `MCP_PG_CONNSTR` | Cadena de conexión a PostgreSQL | **Proyecto editado**/.env | `postgresql://user:pass@localhost:5432/db` |
| `PORT` | Puerto para servidor HTTP (opcional) | Proyecto editado/.env | `3000` |
| `NODE_ENV` | Entorno de ejecución | Proyecto editado/.env | `production` |

## 🔄 Ejemplos de cadenas de conexión

### PostgreSQL local:
```
MCP_PG_CONNSTR=postgresql://postgres:password@localhost:5432/mydatabase
```

### PostgreSQL remoto:
```
MCP_PG_CONNSTR=postgresql://username:password@hostname:5432/database_name
```

### Con SSL:
```
MCP_PG_CONNSTR=postgresql://username:password@hostname:5432/database_name?sslmode=require
```

### Con parámetros adicionales:
```
MCP_PG_CONNSTR=postgresql://user:pass@host:5432/db?application_name=mcp-server&connect_timeout=10
```

## 🐛 Solución de problemas

### Error: "MCP_PG_CONNSTR no está definida"
- **IMPORTANTE**: El archivo `.env` debe estar en la **raíz del proyecto que estás editando**, NO en la carpeta del servidor MCP
- El servidor busca en `[directorio-de-tu-proyecto]/.env`
- Verifica que la variable `MCP_PG_CONNSTR` está definida correctamente en ese archivo
- Revisa el mensaje de error que muestra la ruta exacta donde busca el archivo

### Error de conexión a la base de datos
- Verifica que PostgreSQL está ejecutándose
- Confirma que las credenciales son correctas
- Asegúrate de que el usuario tiene permisos de lectura en las tablas

### El servidor no aparece en Claude Desktop
- Verifica que las rutas en `claude_desktop_config.json` son absolutas y correctas
- Reinicia Claude Desktop después de modificar la configuración
- Revisa los logs de error en la consola

### Problemas de permisos
```sql
-- Otorgar permisos de lectura al usuario
GRANT SELECT ON ALL TABLES IN SCHEMA public TO tu_usuario;
GRANT USAGE ON SCHEMA public TO tu_usuario;
```

## 📝 Logs y depuración

El servidor usa `console.error()` para logging, que es seguro con el transporte STDIO de MCP. Los logs incluyen:

- ✅ Confirmación de conexión exitosa a PostgreSQL
- 🔍 Consultas ejecutadas (primeros 100 caracteres)
- ❌ Errores de conexión y consultas
- 📊 Información de inicio del servidor

## 🤝 Contribución

1. Fork del repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crea un Pull Request

## 📄 Licencia

MIT License - ver archivo [LICENSE](LICENSE) para más detalles.

## 🔗 Enlaces útiles

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Documentación de PostgreSQL](https://www.postgresql.org/docs/)
- [Claude Desktop](https://claude.ai/desktop)
- [node-postgres (pg)](https://node-postgres.com/)

## 📞 Soporte

Si encuentras algún problema o tienes sugerencias, por favor:

1. Revisa la sección de [solución de problemas](#-solución-de-problemas)
2. Busca en los [issues existentes](../../issues)
3. Crea un nuevo issue si es necesario

---

**⚠️ Recordatorio de seguridad**: Este servidor solo permite consultas SELECT para mantener la seguridad de tu base de datos. No modifica, elimina ni altera datos de ninguna manera.