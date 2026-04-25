-- ============================================================
--  Sistema de Registro y Cálculo de Resultados Académicos
--  Esquema completo — versión 3
--  Instituto Tecnológico de Veracruz
--
--  Cambios respecto a v2:
--  + RFC como PK de Maestro (era numero_empleado)
--  + RFC = username automático del maestro
--  + Se eliminó UNIQUE(clave_materia, rfc, id_periodo) en Grupo
--    (un maestro puede tener varios grupos de la misma materia) (Admin define qué tipos puede
--    elegir el Maestro para cada unidad)
-- ============================================================

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS,   UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ── Base de datos ─────────────────────────────────────────────────────────────
DROP DATABASE IF EXISTS `rca_sistema`;
CREATE SCHEMA `rca_sistema`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci;
USE `rca_sistema`;


-- ─────────────────────────────────────────────────────────────────────────────
--  TABLAS SIN DEPENDENCIAS
-- ─────────────────────────────────────────────────────────────────────────────

-- Administrador
CREATE TABLE `administrador` (
  `id_admin`             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `nombre`               VARCHAR(80)   NOT NULL,
  `apellido_paterno`     VARCHAR(50)   NOT NULL,
  `apellido_materno`     VARCHAR(50)   NULL DEFAULT NULL,
  `correo_institucional` VARCHAR(100)  NOT NULL,
  `correo_personal`      VARCHAR(100)  NULL DEFAULT NULL,
  `tel_celular`          VARCHAR(15)   NULL DEFAULT NULL,
  `activo`               TINYINT       NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_admin`)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Usuario con acceso administrativo al sistema';


-- Maestro  (sin columnas usuario/password — autenticación va en tabla usuario)
CREATE TABLE `maestro` (
  `rfc`               VARCHAR(13)   NOT NULL  COMMENT 'RFC — Identificador único y username del docente',
  `nombre`            VARCHAR(80)   NOT NULL,
  `apellido_paterno`  VARCHAR(50)   NOT NULL,
  `apellido_materno`  VARCHAR(50)   NULL DEFAULT NULL,
  `curp`              CHAR(18)      NULL DEFAULT NULL,
  `fecha_nacimiento`  DATE          NULL DEFAULT NULL,
  `genero`            ENUM('M','F','Otro') NULL DEFAULT NULL,
  `correo_institucional` VARCHAR(100) NOT NULL,
  `correo_personal`   VARCHAR(100)  NULL DEFAULT NULL,
  `tel_celular`       VARCHAR(15)   NULL DEFAULT NULL,
  `tel_oficina`       VARCHAR(15)   NULL DEFAULT NULL,
  `direccion`         VARCHAR(200)  NULL DEFAULT NULL,
  `tipo_contrato`     VARCHAR(40)   NULL DEFAULT NULL  COMMENT 'Ej. Tiempo completo, Hora-semana-mes',
  `estatus`           ENUM('Activo','Licencia','Inactivo') NOT NULL DEFAULT 'Activo',
  `fecha_ingreso`     DATE          NULL DEFAULT NULL,
  `grado_academico`   VARCHAR(40)   NULL DEFAULT NULL  COMMENT 'Ej. Maestría, Doctorado',
  `especialidad`      VARCHAR(100)  NULL DEFAULT NULL,
  `departamento`      VARCHAR(80)   NULL DEFAULT NULL,
  PRIMARY KEY (`rfc`),
  UNIQUE INDEX `uq_Maestro_CURP` (`curp`)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Docente que imparte grupos';


-- Carrera
CREATE TABLE `carrera` (
  `id_carrera`      VARCHAR(10)   NOT NULL  COMMENT 'Ej. ISC, IIA',
  `nombre_carrera`  VARCHAR(100)  NOT NULL,
  `siglas`          VARCHAR(10)   NULL DEFAULT NULL,
  `plan_estudios`   VARCHAR(20)   NULL DEFAULT NULL  COMMENT 'Clave SEP/TecNM',
  `modalidad`       ENUM('Presencial','A distancia','Mixta') NULL DEFAULT 'Presencial',
  `total_semestres` TINYINT UNSIGNED  NULL DEFAULT NULL,
  `total_creditos`  SMALLINT UNSIGNED NULL DEFAULT NULL,
  PRIMARY KEY (`id_carrera`),
  UNIQUE INDEX `uq_Carrera_nombre` (`nombre_carrera`)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Programa académico ofrecido por la institución';


-- Alumno  (sin columnas usuario/password)
CREATE TABLE `alumno` (
  `matricula`            VARCHAR(15)   NOT NULL  COMMENT 'Matrícula única del estudiante',
  `id_carrera`           VARCHAR(10)   NOT NULL  COMMENT 'FK → Carrera',
  `nombre`               VARCHAR(80)   NOT NULL,
  `apellido_paterno`     VARCHAR(50)   NOT NULL,
  `apellido_materno`     VARCHAR(50)   NULL DEFAULT NULL,
  `curp`                 CHAR(18)      NULL DEFAULT NULL,
  `fecha_nacimiento`     DATE          NULL DEFAULT NULL,
  `genero`               ENUM('M','F','Otro') NULL DEFAULT NULL,
  `correo_institucional` VARCHAR(100)  NOT NULL,
  `correo_personal`      VARCHAR(100)  NULL DEFAULT NULL,
  `tel_celular`          VARCHAR(15)   NULL DEFAULT NULL,
  `tel_casa`             VARCHAR(15)   NULL DEFAULT NULL,
  `direccion`            VARCHAR(200)  NULL DEFAULT NULL,
  PRIMARY KEY (`matricula`),
  UNIQUE INDEX `uq_Alumno_CURP` (`curp`),
  INDEX `fk_Alumno_Car` (`id_carrera`),
  CONSTRAINT `fk_Alumno_Car`
    FOREIGN KEY (`id_carrera`) REFERENCES `carrera` (`id_carrera`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Estudiante inscrito en la institución';


-- Periodo escolar
CREATE TABLE `periodo_escolar` (
  `id_periodo`   INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `descripcion`  VARCHAR(60)   NOT NULL  COMMENT 'Ej. Enero-Junio 2025',
  `anio`         YEAR          NOT NULL,
  `fecha_inicio` DATE          NOT NULL,
  `fecha_fin`    DATE          NOT NULL,
  `estatus`      ENUM('Vigente','Concluido','Proximo') NOT NULL DEFAULT 'Proximo',
  PRIMARY KEY (`id_periodo`),
  UNIQUE INDEX `uq_periodo_descripcion` (`descripcion`)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Ciclo académico semestral';


-- Materia
CREATE TABLE `materia` (
  `clave_materia`    VARCHAR(15)      NOT NULL  COMMENT 'Clave alfanumérica oficial',
  `nombre_materia`   VARCHAR(100)     NOT NULL,
  `caracterizacion`  TEXT             NULL DEFAULT NULL,
  `creditos_totales` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `horas_teoricas`   TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `horas_practicas`  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `no_unidades`      TINYINT UNSIGNED NOT NULL DEFAULT 0
    COMMENT 'Total de unidades que integran la materia',
  PRIMARY KEY (`clave_materia`)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Asignatura del plan de estudios';


-- Usuario  (único punto de autenticación para los tres roles)
CREATE TABLE `usuario` (
  `id_usuario`     INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `username`       VARCHAR(50)   NOT NULL,
  `pwd`            VARCHAR(255)  NOT NULL  COMMENT 'BCrypt. Nunca texto plano.',
  `rol`            ENUM('administrador','maestro','alumno') NOT NULL,
  `id_referencia`  VARCHAR(20)   NOT NULL
    COMMENT 'matricula / rfc / id_admin según rol',
  `activo`         TINYINT       NOT NULL DEFAULT 1,
  `fecha_creacion` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ultimo_acceso`  DATETIME      NULL DEFAULT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE INDEX `uq_usuario_username` (`username`)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Autenticación y control de acceso. Integridad de id_referencia garantizada por trigger.';


-- Tipo de actividad  (catálogo administrado por el Administrador)
CREATE TABLE `tipo_actividad` (
  `id_tipo`     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre`      VARCHAR(80)  NOT NULL  COMMENT 'Ej. Tarea, Examen, Práctica',
  `descripcion` VARCHAR(255) NULL DEFAULT NULL,
  `activo`      TINYINT(1)   NOT NULL DEFAULT 1  COMMENT '0 = oculto del catálogo',
  PRIMARY KEY (`id_tipo`),
  UNIQUE INDEX `uq_tipo_nombre` (`nombre`)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Catálogo de tipos de actividad evaluable — gestionado por el Administrador';


-- ─────────────────────────────────────────────────────────────────────────────
--  TABLAS CON DEPENDENCIAS
-- ─────────────────────────────────────────────────────────────────────────────

-- Retícula  (materia ↔ carrera, muchos-a-muchos)
CREATE TABLE `reticula` (
  `clave_materia` VARCHAR(15)      NOT NULL  COMMENT 'FK → Materia',
  `id_carrera`    VARCHAR(10)      NOT NULL  COMMENT 'FK → Carrera',
  `semestre`      TINYINT UNSIGNED NOT NULL  COMMENT 'Semestre del plan',
  `creditos`      TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`clave_materia`, `id_carrera`),
  INDEX `fk_Reticula_Car` (`id_carrera`),
  CONSTRAINT `fk_Reticula_Mat`
    FOREIGN KEY (`clave_materia`) REFERENCES `materia` (`clave_materia`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_Reticula_Car`
    FOREIGN KEY (`id_carrera`) REFERENCES `carrera` (`id_carrera`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Asocia Materia con Carrera en el plan de estudios';


-- Grupo
CREATE TABLE `grupo` (
  `id_grupo`        INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `clave_materia`   VARCHAR(15)   NOT NULL  COMMENT 'FK → Materia',
  `rfc`             VARCHAR(13)   NOT NULL  COMMENT 'FK → Maestro (RFC)',
  `id_periodo`      INT UNSIGNED  NOT NULL  COMMENT 'FK → PeriodoEscolar',
  `limite_alumnos`  TINYINT UNSIGNED NOT NULL DEFAULT 30,
  `horario`         VARCHAR(100)  NULL DEFAULT NULL,
  `aula`            VARCHAR(40)   NULL DEFAULT NULL,
  `estatus`         ENUM('Activo','Cerrado','Cancelado') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id_grupo`),
  INDEX `fk_Grupo_Mat`      (`clave_materia`),
  INDEX `fk_Grupo_Mae`      (`rfc`),
  INDEX `idx_grupo_periodo`  (`id_periodo`),
  CONSTRAINT `fk_Grupo_Mat`
    FOREIGN KEY (`clave_materia`)   REFERENCES `materia`         (`clave_materia`)  ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_Grupo_Mae`
    FOREIGN KEY (`rfc`)             REFERENCES `maestro`         (`rfc`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_Grupo_Per`
    FOREIGN KEY (`id_periodo`)      REFERENCES `periodo_escolar` (`id_periodo`)      ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Instancia de una materia en un periodo impartida por un maestro';


-- Unidad  (creada y administrada por el Administrador)
CREATE TABLE `unidad` (
  `id_unidad`     INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `clave_materia` VARCHAR(15)   NOT NULL  COMMENT 'FK → Materia',
  `nombre_unidad` VARCHAR(100)  NOT NULL,
  `temario`       TEXT          NULL DEFAULT NULL,
  `estatus`       ENUM('Pendiente','En curso','Cerrada') NOT NULL DEFAULT 'Pendiente',
  `fecha_cierre`  DATE          NULL DEFAULT NULL,
  PRIMARY KEY (`id_unidad`),
  INDEX `fk_Unidad_Mat` (`clave_materia`),
  CONSTRAINT `fk_Unidad_Mat`
    FOREIGN KEY (`clave_materia`) REFERENCES `materia` (`clave_materia`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='División de contenido de una materia — creada por el Administrador';


-- Unidad-Tipo de actividad  (Admin define qué tipos puede usar el Maestro por unidad)
CREATE TABLE `unidad_tipo_actividad` (
  `id_unidad` INT UNSIGNED NOT NULL  COMMENT 'FK → Unidad',
  `id_tipo`   INT UNSIGNED NOT NULL  COMMENT 'FK → tipo_actividad',
  PRIMARY KEY (`id_unidad`, `id_tipo`),
  CONSTRAINT `fk_UTA_Unidad`
    FOREIGN KEY (`id_unidad`) REFERENCES `unidad`         (`id_unidad`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_UTA_Tipo`
    FOREIGN KEY (`id_tipo`)   REFERENCES `tipo_actividad` (`id_tipo`)   ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Tipos de actividad permitidos por el Admin para cada unidad. Si vacío, el Maestro ve todos.';


-- Grupo-Unidad  (ponderación de cada unidad en el grupo)
CREATE TABLE `grupo_unidad` (
  `id_grupo`      INT UNSIGNED NOT NULL  COMMENT 'FK → Grupo',
  `id_unidad`     INT UNSIGNED NOT NULL  COMMENT 'FK → Unidad',
  `ponderacion`   DECIMAL(5,2) NOT NULL DEFAULT 0
    COMMENT 'Peso de esta unidad en la calificación final del grupo',
  `agrupacion_id` TINYINT UNSIGNED NULL DEFAULT NULL
    COMMENT 'NULL = independiente. Mismo número = unidades fusionadas',
  `tipo_config`   ENUM('original','fusionada','dividida') NOT NULL DEFAULT 'original',
  PRIMARY KEY (`id_grupo`, `id_unidad`),
  CONSTRAINT `fk_GU_Grupo`
    FOREIGN KEY (`id_grupo`)  REFERENCES `grupo`  (`id_grupo`)  ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_GU_Unidad`
    FOREIGN KEY (`id_unidad`) REFERENCES `unidad` (`id_unidad`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB
  COMMENT='Peso de cada unidad dentro de un grupo específico';


-- Actividad  (definida por el Maestro para un grupo-unidad específico)
CREATE TABLE `actividad` (
  `id_actividad`      INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `id_grupo`          INT UNSIGNED  NOT NULL  COMMENT 'FK → Grupo',
  `id_unidad`         INT UNSIGNED  NOT NULL  COMMENT 'FK → Unidad',
  `id_tipo_actividad` INT UNSIGNED  NULL DEFAULT NULL  COMMENT 'FK → tipo_actividad (nullable)',
  `nombre_actividad`  VARCHAR(100)  NOT NULL,
  `ponderacion`       DECIMAL(5,2)  NOT NULL
    COMMENT 'Porcentaje (0-100); suma por (id_grupo, id_unidad) = 100',
  `tipo_evaluacion`   ENUM('Formativa','Sumativa','Diagnóstica') NOT NULL DEFAULT 'Sumativa',
  `estatus`           ENUM('Pendiente','Calificada','Cerrada') NOT NULL DEFAULT 'Pendiente',
  `fecha_entrega`     DATE          NULL DEFAULT NULL,
  `bloqueado`         TINYINT(1)    NOT NULL DEFAULT 0
    COMMENT '1 = bloqueada (al guardar unidad o al registrar primera calificación)',
  PRIMARY KEY (`id_actividad`),
  INDEX `fk_Activ_Grupo`  (`id_grupo`),
  INDEX `fk_Activ_Unidad` (`id_unidad`),
  INDEX `fk_Activ_Tipo`   (`id_tipo_actividad`),
  CONSTRAINT `fk_Activ_Grupo`
    FOREIGN KEY (`id_grupo`)          REFERENCES `grupo`          (`id_grupo`)  ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_Activ_Unidad`
    FOREIGN KEY (`id_unidad`)         REFERENCES `unidad`         (`id_unidad`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_Activ_Tipo`
    FOREIGN KEY (`id_tipo_actividad`) REFERENCES `tipo_actividad` (`id_tipo`)   ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Elemento evaluable definido por el Maestro para un grupo-unidad';


-- Config evaluación por unidad
CREATE TABLE `config_evaluacion_unidad` (
  `id_grupo`        INT UNSIGNED NOT NULL,
  `id_unidad`       INT UNSIGNED NOT NULL,
  `pct_actividades` DECIMAL(5,2) NOT NULL DEFAULT 60.00,
  `pct_examen`      DECIMAL(5,2) NOT NULL DEFAULT 30.00,
  `pct_asistencia`  DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  `cal_examen`      DECIMAL(5,2) NULL DEFAULT NULL,
  `nota`            VARCHAR(255) NULL DEFAULT NULL,
  `fecha_config`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_grupo`, `id_unidad`),
  CONSTRAINT `fk_CEU_Grupo`
    FOREIGN KEY (`id_grupo`)  REFERENCES `grupo`  (`id_grupo`)  ON DELETE CASCADE,
  CONSTRAINT `fk_CEU_Unidad`
    FOREIGN KEY (`id_unidad`) REFERENCES `unidad` (`id_unidad`) ON DELETE CASCADE
) ENGINE=InnoDB
  COMMENT='Distribución porcentual de rubros por grupo-unidad';


-- Inscripción
CREATE TABLE `inscripcion` (
  `matricula`         VARCHAR(15)  NOT NULL  COMMENT 'FK → Alumno',
  `id_grupo`          INT UNSIGNED NOT NULL  COMMENT 'FK → Grupo',
  `fecha_inscripcion` DATE         NOT NULL,
  `estatus`           ENUM('Cursando','Baja','Aprobado','Reprobado') NOT NULL DEFAULT 'Cursando',
  `tipo_curso`        ENUM('Ordinario','Recursado','Especial')       NOT NULL DEFAULT 'Ordinario',
  PRIMARY KEY (`matricula`, `id_grupo`),
  INDEX `fk_Inscr_Grupo` (`id_grupo`),
  CONSTRAINT `fk_Inscr_Alumno`
    FOREIGN KEY (`matricula`) REFERENCES `alumno` (`matricula`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_Inscr_Grupo`
    FOREIGN KEY (`id_grupo`)  REFERENCES `grupo`  (`id_grupo`)  ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Relación alumno-grupo';


-- Resultado por actividad
CREATE TABLE `resultado_actividad` (
  `matricula`             VARCHAR(15)  NOT NULL  COMMENT 'PK/FK → Alumno',
  `id_actividad`          INT UNSIGNED NOT NULL  COMMENT 'PK/FK → Actividad',
  `calificacion_obtenida` DECIMAL(5,2) NULL DEFAULT NULL,
  `calificacion_anterior` DECIMAL(5,2) NULL DEFAULT NULL  COMMENT 'Valor previo (auditoría)',
  `fecha_registro`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `estatus`               ENUM('Pendiente','Validada','NP') NOT NULL DEFAULT 'Pendiente',
  `rfc`                   VARCHAR(13)  NOT NULL  COMMENT 'FK → Maestro que registró (RFC)',
  PRIMARY KEY (`matricula`, `id_actividad`),
  INDEX `fk_RA_Actividad` (`id_actividad`),
  INDEX `fk_RA_Maestro`   (`rfc`),
  CONSTRAINT `fk_RA_Alumno`
    FOREIGN KEY (`matricula`)       REFERENCES `alumno`    (`matricula`)    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_RA_Actividad`
    FOREIGN KEY (`id_actividad`)    REFERENCES `actividad` (`id_actividad`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_RA_Maestro`
    FOREIGN KEY (`rfc`)             REFERENCES `maestro`   (`rfc`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Calificación individual del alumno por actividad';


-- Calificación por unidad  (caché calculada)
CREATE TABLE `calificacion_unidad` (
  `matricula`                VARCHAR(15)  NOT NULL  COMMENT 'PK/FK → Alumno',
  `id_unidad`                INT UNSIGNED NOT NULL  COMMENT 'PK/FK → Unidad',
  `id_grupo`                 INT UNSIGNED NOT NULL  COMMENT 'PK/FK → Grupo',
  `promedio_ponderado`       DECIMAL(5,2) NULL DEFAULT NULL,
  `calificacion_unidad_final` DECIMAL(5,2) NULL DEFAULT NULL,
  `estatus_unidad`           ENUM('Pendiente','Aprobada','Reprobada') NOT NULL DEFAULT 'Pendiente',
  PRIMARY KEY (`matricula`, `id_unidad`, `id_grupo`),
  INDEX `fk_CU_Unidad` (`id_unidad`),
  INDEX `fk_CU_Grupo`  (`id_grupo`),
  CONSTRAINT `fk_CU_Alumno`
    FOREIGN KEY (`matricula`) REFERENCES `alumno`  (`matricula`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_CU_Unidad`
    FOREIGN KEY (`id_unidad`) REFERENCES `unidad`  (`id_unidad`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_CU_Grupo`
    FOREIGN KEY (`id_grupo`)  REFERENCES `grupo`   (`id_grupo`)  ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Promedio de unidad por alumno (caché)';


-- Calificación final
CREATE TABLE `calificacion_final` (
  `matricula`            VARCHAR(15)  NOT NULL  COMMENT 'PK/FK → Alumno',
  `id_grupo`             INT UNSIGNED NOT NULL  COMMENT 'PK/FK → Grupo',
  `promedio_unidades`    DECIMAL(5,2) NULL DEFAULT NULL,
  `calificacion_oficial` DECIMAL(5,2) NULL DEFAULT NULL  COMMENT 'Nota asentada en acta',
  `estatus_final`        ENUM('Pendiente','Aprobado','Reprobado','Especial') NOT NULL DEFAULT 'Pendiente',
  PRIMARY KEY (`matricula`, `id_grupo`),
  INDEX `fk_CF_Grupo` (`id_grupo`),
  CONSTRAINT `fk_CF_Alumno`
    FOREIGN KEY (`matricula`) REFERENCES `alumno` (`matricula`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_CF_Grupo`
    FOREIGN KEY (`id_grupo`)  REFERENCES `grupo`  (`id_grupo`)  ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Calificación final del alumno en el grupo';


-- Bonus por unidad
CREATE TABLE `bonusunidad` (
  `matricula`          VARCHAR(15)  NOT NULL  COMMENT 'PK/FK → Alumno',
  `id_unidad`          INT UNSIGNED NOT NULL  COMMENT 'PK/FK → Unidad',
  `id_grupo`           INT UNSIGNED NOT NULL  COMMENT 'PK/FK → Grupo',
  `rfc`                VARCHAR(13)  NOT NULL  COMMENT 'FK → Maestro (RFC)',
  `puntos_otorgados`   DECIMAL(4,2) NOT NULL,
  `justificacion`      TEXT         NOT NULL,
  `fecha_asignacion`   DATE         NOT NULL DEFAULT (CURDATE()),
  `fecha_modificacion` DATE         NULL DEFAULT NULL,
  `estatus`            ENUM('Activo','Cancelado') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`matricula`, `id_unidad`, `id_grupo`),
  INDEX `fk_BU_Unidad`  (`id_unidad`),
  INDEX `fk_BU_Grupo`   (`id_grupo`),
  INDEX `fk_BU_Maestro` (`rfc`),
  CONSTRAINT `fk_BU_Alumno`
    FOREIGN KEY (`matricula`)       REFERENCES `alumno`  (`matricula`)       ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_BU_Unidad`
    FOREIGN KEY (`id_unidad`)       REFERENCES `unidad`  (`id_unidad`)       ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_BU_Grupo`
    FOREIGN KEY (`id_grupo`)        REFERENCES `grupo`   (`id_grupo`)        ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_BU_Maestro`
    FOREIGN KEY (`rfc`)             REFERENCES `maestro` (`rfc`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Puntos adicionales por unidad';


-- Bonus final
CREATE TABLE `bonusfinal` (
  `matricula`          VARCHAR(15)  NOT NULL  COMMENT 'PK/FK → Alumno',
  `id_grupo`           INT UNSIGNED NOT NULL  COMMENT 'PK/FK → Grupo',
  `rfc`                VARCHAR(13)  NOT NULL  COMMENT 'FK → Maestro (RFC)',
  `puntos_otorgados`   DECIMAL(4,2) NOT NULL,
  `justificacion`      TEXT         NOT NULL,
  `fecha_asignacion`   DATE         NOT NULL DEFAULT (CURDATE()),
  `fecha_modificacion` DATE         NULL DEFAULT NULL,
  `estatus`            ENUM('Activo','Aplicado') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`matricula`, `id_grupo`),
  INDEX `fk_BF_Maestro` (`rfc`),
  CONSTRAINT `fk_BF_CalFinal`
    FOREIGN KEY (`matricula`, `id_grupo`) REFERENCES `calificacion_final` (`matricula`, `id_grupo`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_BF_Maestro`
    FOREIGN KEY (`rfc`)             REFERENCES `maestro` (`rfc`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Puntos adicionales a nivel materia';


-- Modificación final
CREATE TABLE `modificacionfinal` (
  `matricula`          VARCHAR(15)  NOT NULL  COMMENT 'PK/FK → Alumno',
  `id_grupo`           INT UNSIGNED NOT NULL  COMMENT 'PK/FK → Grupo',
  `rfc`                VARCHAR(13)  NOT NULL  COMMENT 'FK → Maestro (RFC)',
  `calif_original`     DECIMAL(5,2) NOT NULL,
  `calif_modificada`   DECIMAL(5,2) NOT NULL,
  `justificacion`      TEXT         NOT NULL,
  `fecha_modificacion` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `estatus`            ENUM('Aplicado','Auditado') NOT NULL DEFAULT 'Aplicado',
  PRIMARY KEY (`matricula`, `id_grupo`),
  INDEX `fk_MF_Maestro` (`rfc`),
  CONSTRAINT `fk_MF_CalFinal`
    FOREIGN KEY (`matricula`, `id_grupo`) REFERENCES `calificacion_final` (`matricula`, `id_grupo`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_MF_Maestro`
    FOREIGN KEY (`rfc`)             REFERENCES `maestro` (`rfc`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Ajuste manual del docente sobre la calificación final';


-- ─────────────────────────────────────────────────────────────────────────────
--  DATOS INICIALES
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO `tipo_actividad` (`nombre`, `descripcion`) VALUES
  ('Examen',        'Evaluación escrita o en línea'),
  ('Tarea',         'Actividad de trabajo en casa o individual'),
  ('Práctica',      'Actividad práctica en laboratorio o taller'),
  ('Exposición',    'Presentación oral ante el grupo'),
  ('Proyecto',      'Trabajo integrador de mayor alcance'),
  ('Cuestionario',  'Serie de preguntas de comprensión'),
  ('Investigación', 'Reporte o ensayo de investigación documental'),
  ('Asistencia',    'Control de asistencia como parte de la evaluación');


-- ─────────────────────────────────────────────────────────────────────────────
--  RESTAURAR MODOS
-- ─────────────────────────────────────────────────────────────────────────────
SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;


-- ============================================================
--  FIN DEL ESQUEMA v4
--  Después de ejecutar este archivo correr: node backend/seed.js
-- ============================================================
