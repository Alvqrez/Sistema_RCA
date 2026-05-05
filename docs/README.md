# Sistema RCA — Registro y Cálculo de Resultados Académicos

> **Sistema integral de gestión académica** para instituciones educativas que permite registrar, calcular y validar resultados académicos de manera estructurada, segura y confiable.

[![Estado](https://img.shields.io/badge/estado-activo-brightgreen)]()
[![Node.js](https://img.shields.io/badge/Node.js-≥14-green)]()
[![MySQL](https://img.shields.io/badge/MySQL-≥5.7-blue)]()
[![Licencia](https://img.shields.io/badge/licencia-MIT-orange)]()

---

## 📋 Descripción

Sistema RCA es una solución informática diseñada para **automatizar y validar el proceso de evaluación académica** en instituciones educativas, particularmente adaptado a las normas del TecNM (Tecnológico Nacional de México).

El sistema permite:
- ✅ Registrar alumnos, maestros, materias y grupos
- ✅ Definir estructuras de evaluación flexibles por grupo
- ✅ Asignar actividades evaluables con ponderaciones validadas
- ✅ Calcular automáticamente promedios ponderados y calificaciones finales
- ✅ Aplicar puntos adicionales (bonus) de forma controlada
- ✅ Generar reportes y estadísticas académicas
- ✅ Exportar/importar datos en CSV

---

## 🏗️ Arquitectura

```
Sistema RCA/
├── backend/                    # Node.js + Express
│   ├── src/
│   │   ├── routes/            # API endpoints
│   │   ├── services/          # Lógica de negocio
│   │   ├── middleware/        # Autenticación
│   │   └── db.js              # Conexión MySQL
│   ├── server.js              # Servidor principal
│   └── package.json
│
├── frontend/                   # HTML + CSS + JavaScript
│   ├── admin/                 # Panel de administración
│   ├── maestro/               # Portal de maestros
│   ├── alumno/                # Portal de alumnos
│   ├── shared/                # Componentes compartidos
│   └── css/                   # Estilos globales
│
└── database/                   # Scripts SQL
    └── rca_sistema_v10.sql    # Schema
```

### Stack Tecnológico

**Backend:**
- Node.js + Express.js
- MySQL 5.7+
- JWT (autenticación)
- bcrypt (contraseñas)

**Frontend:**
- HTML5 / CSS3 / Vanilla JavaScript
- Iconify (iconos)
- Responsive design

---

## 🚀 Instalación

### Requisitos
- Node.js v14+
- MySQL 5.7+
- npm o yarn

### Pasos

#### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/Sistema_RCA.git
cd Sistema_RCA
```

#### 2. Configurar Base de Datos
```bash
mysql -u root -p < database/rca_sistema_v10.sql
```

#### 3. Configurar Backend
```bash
cd backend
npm install

# Crear archivo .env
cat > .env << EOF
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=rca_sistema
JWT_SECRET=tu_secret_key
PORT=3000
EOF

npm start
```

#### 4. Configurar Frontend
```bash
# Editar API_URL en frontend/shared/js/sidebar.js si es necesario
# Por defecto: http://localhost:3000
```

#### 5. Acceder
- **Admin:** http://localhost:3000/frontend/shared/pages/login.html
- **Credenciales iniciales:** Ver base de datos (seed.js)

---

## 📖 Características Principales

### 1. **Gestión de Usuarios**
- Tres roles: Administrador, Maestro, Alumno
- Autenticación segura con JWT
- Control de acceso basado en roles

### 2. **Estructura Académica**
- Carreras, materias y grupos
- Periodos escolares
- Inscripción de alumnos por grupo

### 3. **Evaluación Académica**
- Unidades por materia
- Actividades evaluables por unidad y grupo
- **Ponderaciones validadas** (suma = 100%)
- Resultados individuales por alumno

### 4. **Cálculo de Calificaciones**
- Promedio ponderado por unidad
- Promedio final por materia
- Bonus (puntos adicionales) por unidad o materia
- **Redondeo TecNM** (fracción ≥ 0.5 sube)
- Límite máximo (100) validado

### 5. **Reportes y Exportación**
- Visualización de resultados
- Exportación a CSV
- Importación masiva de datos

---

## 🔐 Seguridad

- ✅ Contraseñas hasheadas con bcrypt
- ✅ Tokens JWT con expiración
- ✅ Validación de permisos por rol
- ✅ Prevención de SQL injection
- ✅ CORS configurado
- ✅ Validación de integridad de datos

---

## 📊 Casos de Uso

### Administrador
- Crear y gestionar carreras, materias, grupos
- Definir periodos escolares
- Registrar maestros y alumnos
- Inscribir alumnos a grupos
- Crear unidades académicas
- Exportar/importar datos

### Maestro
- Configurar estructura de evaluación
- Definir actividades por grupo
- Registrar calificaciones
- Asignar bonus
- Generar reportes de grupo
- Ver estadísticas

### Alumno
- Ver sus calificaciones
- Consultar resultados por materia
- Revisar detalles de evaluación
- Cambiar contraseña

---

## 🎯 Reglas Académicas Implementadas

### Validaciones
- ✅ Suma de ponderaciones por unidad = **100%**
- ✅ Alumno solo puede estar en **1 grupo** de la misma materia en el mismo periodo
- ✅ Calificaciones en rango **0-100**
- ✅ Bonus no puede exceder 100 (validado)
- ✅ Maestro solo puede asignar actividades en sus grupos
- ✅ Alumno solo recibe calificaciones si está inscrito

### Cálculos
- Promedio ponderado: `Σ(Calificación × Peso%)`
- Calificación final: `Promedio de todas las unidades`
- Con bonus: `Calificación + Bonus` (máx 100)
- Aprobatorio: ≥ 70

---

## 📁 Estructura de Carpetas

### Backend Routes
```
backend/src/routes/
├── admin/
│   ├── admin.js          # Usuarios, password
│   ├── alumnos.js        # CRUD alumnos
│   ├── maestros.js       # CRUD maestros
│   ├── carreras.js       # CRUD carreras
│   ├── periodos.js       # CRUD periodos
│   ├── materias.js       # CRUD materias
│   ├── grupos.js         # CRUD grupos
│   └── inscripciones.js  # Inscripciones
│
├── maestro/
│   ├── actividades.js      # Configurar actividades
│   ├── calificaciones.js   # Registrar calificaciones
│   ├── resultado_actividad.js  # Resultados
│   └── bonus.js            # Asignar bonus
│
└── shared/
    └── login.js            # Autenticación
```

### Frontend Structure
```
frontend/
├── admin/pages/
│   ├── admin.html
│   ├── alumnos.html
│   ├── maestros.html
│   ├── materias.html
│   ├── grupos.html
│   ├── inscripcion.html
│   ├── periodos.html
│   ├── carreras.html
│   ├── actividadesAdmin.html
│   ├── unidades.html
│   └── utilerias.html
│
├── maestro/pages/
│   ├── gruposMaestro.html
│   ├── configurar_actividades.html
│   ├── captura_calificaciones.html
│   └── utilerias_maestro.html
│
├── alumno/pages/
│   ├── portalAlumno.html
│   └── utilerias_alumno.html
│
└── shared/pages/
    ├── login.html
    ├── reportes.html
    └── estadisticas.html
```

---

## 🔧 Configuración Avanzada

### Variables de Entorno (.env)
```bash
# Base de datos
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=secure_password
DB_NAME=rca_sistema

# JWT
JWT_SECRET=your_super_secret_jwt_key

# Server
PORT=3000
NODE_ENV=development
```

### Configuración de CORS
En `backend/server.js`:
```javascript
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
```

---

## 📝 API Endpoints

### Autenticación
```
POST   /api/login                    # Iniciar sesión
POST   /api/logout                   # Cerrar sesión
PUT    /api/admin/mi-password        # Cambiar contraseña
```

### Alumnos (Admin)
```
GET    /api/alumnos                  # Listar todos
POST   /api/alumnos                  # Crear alumno
GET    /api/alumnos/:no_control      # Obtener uno
PUT    /api/alumnos/:no_control      # Actualizar
DELETE /api/alumnos/:no_control      # Eliminar
```

### Inscripciones
```
GET    /api/inscripciones            # Listar todas
POST   /api/inscripciones            # Crear
POST   /api/inscripciones/bulk       # Inscripción masiva
GET    /api/inscripciones/grupo/:id  # Por grupo
PUT    /api/inscripciones/:no_control/:id_grupo/estatus  # Cambiar estado
DELETE /api/inscripciones/:no_control/:id_grupo         # Eliminar
```

### Calificaciones (Maestro)
```
POST   /api/calificaciones           # Registrar calificación
GET    /api/calificaciones/grupo/:id # Por grupo
PUT    /api/calificaciones/:id       # Actualizar
```

---

## 🐛 Solución de Problemas

### "Failed to load resource: 400 (Bad Request)"
**Causa:** Error en formato de datos enviado a API  
**Solución:** Verificar estructura de JSON en las peticiones

### "Token expirado"
**Causa:** JWT token vencido  
**Solución:** Reiniciar sesión

### Errores de conexión MySQL
**Causa:** Credenciales incorrectas o MySQL no corriendo  
**Solución:** 
```bash
mysql -u root -p  # Verificar acceso
systemctl start mysql  # En Linux
```

### "CORS error"
**Causa:** Frontend en puerto diferente al backend  
**Solución:** Actualizar `origin` en CORS config o `API_URL` en frontend

---

## 📋 Checklist de Implementación

- [x] Base de datos con todas las entidades
- [x] Autenticación y autorización
- [x] CRUD para entidades principales
- [x] Cálculo de calificaciones
- [x] Validaciones de integridad
- [x] Exportación/importación CSV
- [x] Portal de maestros
- [x] Portal de alumnos
- [x] Reportes básicos
- [x] Sistema de bonus

---

## 🤝 Contribuir

Las contribuciones son bienvenidas. Para cambios importantes:

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo licencia MIT. Ver `LICENSE` para detalles.

---


## 📞 Soporte

Para reportar bugs o solicitar features, abre un [Issue](https://github.com/tu-usuario/Sistema_RCA/issues).

---

## 🎓 Documentación

- [Documento de Análisis](./docs/Investigación__Sistema_RCA.pdf)
- [Modelo de Datos](./database/rca_sistema_v10.sql)
- [Guía de Uso Admin](./docs/guia-admin.md)
- [Guía de Uso Maestro](./docs/guia-maestro.md)

---

<div align="center">

**Hecho con ❤️ por el equipo de desarrollo**

Instituto Tecnológico de Veracruz — 2024

</div>
