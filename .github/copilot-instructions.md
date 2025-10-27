# MCP PostgreSQL Server

This is a Model Context Protocol (MCP) server for PostgreSQL database access.

## Features
- Secure PostgreSQL database access via MCP
- Only allows SELECT queries for security
- Reads connection string from MCP_PG_CONNSTR environment variable from .env file
- Built with pure JavaScript (no TypeScript)
- Proper error handling and logging

## Development Guidelines
- Use pure JavaScript for all server code
- Implement proper error handling and logging  
- Follow MCP protocol specifications
- Ensure security by only allowing SELECT operations
- Read connection string from .env file in project root (the project being edited, not the MCP server directory)