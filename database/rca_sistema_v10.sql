-- ============================================================
--  Sistema de Registro y Cálculo de Resultados Académicos
--  Esquema — versión 10
--  Instituto Tecnológico de Veracruz
--
--  CAMBIOS RESPECTO A v6 — CORRECCIONES 1NF / 2NF / 3NF
--  ─────────────────────────────────────────────────────────
--  3NF  • periodo_escolar.anio eliminado: el año se deriva
--         funcionalmente de fecha_inicio (anio → fecha_inicio → anio),
--         lo que introduce una dependencia transitiva.
--         Usar YEAR(fecha_inicio) en las consultas que necesiten el año.
--
--  3NF  • config_evaluacion_unidad.cal_examen eliminado: almacena
--         una calificación que ya existe (o puede calcularse) en
--         resultado_actividad. Mantenerla duplica datos y puede
--         producir inconsistencias si la calificación de la actividad
--         tipo Examen se modifica.
--
--  DISEÑO • modificacionfinal ahora tiene PK auto-incremental:
--           el documento de análisis dice explícitamente "Pueden
--           existir múltiples modificaciones a la calificación final
--           de un mismo alumno en el mismo grupo". La PK compuesta
--           (no_control, id_grupo) sólo permitía una por par.
--
--  INTEGRIDAD REFERENCIAL
--       • actividad agrega FK hacia grupo_unidad(id_grupo, id_unidad)
--         para garantizar que no se creen actividades en
--         combinaciones grupo-unidad que no existan.
--
--  + NUEVO: Sistema de estatus automático para periodo_escolar
--           • Columna override_manual agregada a periodo_escolar
--           • Event Scheduler diario que recalcula estatus por fecha
--           • Procedimiento cambiar_estatus_periodo() para cambio manual
--           • Procedimiento quitar_override_periodo() para volver al automático
-- ============================================================

-- Quitar modo seguro
SET SQL_SAFE_UPDATES = 0;

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS,   UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE,
    SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- Activar el Event Scheduler (necesario para el estatus automático)
SET GLOBAL event_scheduler = ON;

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
  `rfc`                  VARCHAR(13)   NOT NULL  COMMENT 'RFC — Identificador único y username del administrador',
  `nombre`               VARCHAR(80)   NOT NULL,
  `apellido_paterno`     VARCHAR(50)   NOT NULL,
  `apellido_materno`     VARCHAR(50)   NULL DEFAULT NULL,
  `correo_institucional` VARCHAR(100)  NOT NULL,
  `correo_personal`      VARCHAR(100)  NULL DEFAULT NULL,
  `tel_celular`          VARCHAR(15)   NULL DEFAULT NULL,
  `activo`               TINYINT       NOT NULL DEFAULT 1,
  PRIMARY KEY (`rfc`)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Usuario con acceso administrativo al sistema. RFC es PK y username.';


-- ─────────────────────────────────────────────────────────────────────────────
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
  `grado_academico`   VARCHAR(40)   NULL DEFAULT NULL,
  `especialidad`      VARCHAR(100)  NULL DEFAULT NULL,
  `departamento`      VARCHAR(80)   NULL DEFAULT NULL,
  PRIMARY KEY (`rfc`),
  UNIQUE INDEX `uq_Maestro_CURP` (`curp`)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Docente que imparte grupos';


-- Carrera (sin cambios)
CREATE TABLE `carrera` (
  `id_carrera`      VARCHAR(10)   NOT NULL,
  `nombre_carrera`  VARCHAR(100)  NOT NULL,
  `siglas`          VARCHAR(10)   NULL DEFAULT NULL,
  `plan_estudios`   VARCHAR(20)   NULL DEFAULT NULL,
  `modalidad`       ENUM('Presencial','A distancia','Mixta') NULL DEFAULT 'Presencial',
  `total_semestres` TINYINT UNSIGNED  NULL DEFAULT NULL,
  `total_creditos`  SMALLINT UNSIGNED NULL DEFAULT NULL,
  `estatus`         ENUM('Pendiente','Aceptada','Rechazada') NOT NULL DEFAULT 'Pendiente',
  `creado_por`      VARCHAR(13)   NULL DEFAULT NULL COMMENT 'RFC del admin que la creó',
  `aprobado_por`    VARCHAR(13)   NULL DEFAULT NULL COMMENT 'RFC del admin que la aprobó',
  `fecha_creacion`  DATETIME      NULL DEFAULT NOW(),
  PRIMARY KEY (`id_carrera`),
  UNIQUE INDEX `uq_Carrera_nombre` (`nombre_carrera`)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Programa académico ofrecido por la institución';


-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE `alumno` (
  `no_control`           VARCHAR(8)   NOT NULL,
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
  PRIMARY KEY (`no_control`),
  UNIQUE INDEX `uq_Alumno_CURP` (`curp`),
  INDEX `fk_Alumno_Car` (`id_carrera`),
  CONSTRAINT `fk_Alumno_Car`
    FOREIGN KEY (`id_carrera`) REFERENCES `carrera` (`id_carrera`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Estudiante inscrito en la institución';


-- ─────────────────────────────────────────────────────────────────────────────
--  CORRECCIÓN 3NF — Periodo escolar
--  Se elimina la columna `anio` porque depende transitivamente
--  de fecha_inicio: PK → fecha_inicio → anio.
--  Usar YEAR(fecha_inicio) en las consultas que necesiten el año.
--
--  + NUEVO: override_manual — si es TRUE el scheduler no toca el estatus,
--           permitiendo cambios manuales sin que se sobreescriban al día siguiente.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE `periodo_escolar` (
  `id_periodo`      INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `descripcion`     VARCHAR(60)   NOT NULL  COMMENT 'Ej. Enero-Junio 2025',
  -- `anio` ELIMINADO — se obtiene con YEAR(fecha_inicio) (3NF)
  `fecha_inicio`    DATE          NOT NULL,
  `fecha_fin`       DATE          NOT NULL,
  `estatus`         ENUM('Vigente','Concluido','Proximo') NOT NULL DEFAULT 'Proximo',
  `override_manual` TINYINT(1)    NOT NULL DEFAULT 0
    COMMENT 'Si es 1 el scheduler respeta el estatus manual y no lo sobreescribe',
  PRIMARY KEY (`id_periodo`),
  UNIQUE INDEX `uq_periodo_desc_inicio` (`descripcion`, `fecha_inicio`)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Ciclo académico semestral con estatus automático por fecha';


-- Materia (sin cambios)
CREATE TABLE `materia` (
  `clave_materia`    VARCHAR(15)      NOT NULL,
  `nombre_materia`   VARCHAR(100)     NOT NULL,
  `creditos_totales` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `horas_teoricas`   TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `horas_practicas`  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `no_unidades`      TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`clave_materia`)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Asignatura del plan de estudios';


-- Usuario (sin cambios)
CREATE TABLE `usuario` (
  `id_usuario`     INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `username`       VARCHAR(50)   NOT NULL,
  `pwd`            VARCHAR(255)  NOT NULL,
  `rol`            ENUM('administrador','maestro','alumno') NOT NULL,
  `id_referencia`  VARCHAR(20)   NOT NULL,
  `activo`         TINYINT       NOT NULL DEFAULT 1,
  `fecha_creacion` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ultimo_acceso`  DATETIME      NULL DEFAULT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE INDEX `uq_usuario_username` (`username`)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Autenticación y control de acceso.';


-- Tipo de actividad (sin cambios)
CREATE TABLE `tipo_actividad` (
  `id_tipo`     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre`      VARCHAR(80)  NOT NULL,
  `descripcion` VARCHAR(255) NULL DEFAULT NULL,
  `activo`      TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_tipo`),
  UNIQUE INDEX `uq_tipo_nombre` (`nombre`)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Catálogo de tipos de actividad evaluable';


-- ─────────────────────────────────────────────────────────────────────────────
--  TABLAS CON DEPENDENCIAS
-- ─────────────────────────────────────────────────────────────────────────────

-- Retícula (sin cambios)
CREATE TABLE `reticula` (
  `clave_materia` VARCHAR(15)      NOT NULL,
  `id_carrera`    VARCHAR(10)      NOT NULL,
  `semestre`      TINYINT UNSIGNED NOT NULL,
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


-- Grupo (sin cambios)
CREATE TABLE `grupo` (
  `id_grupo`        INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `clave_materia`   VARCHAR(15)   NOT NULL,
  `rfc`             VARCHAR(13)   NOT NULL,
  `id_periodo`      INT UNSIGNED  NOT NULL,
  `limite_alumnos`  TINYINT UNSIGNED NOT NULL DEFAULT 30,
  `horario`         VARCHAR(100)  NULL DEFAULT NULL,
  `aula`            VARCHAR(40)   NULL DEFAULT NULL,
  `estatus`         ENUM('Activo','Cerrado','Cancelado') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id_grupo`),
  INDEX `fk_Grupo_Mat`      (`clave_materia`),
  INDEX `fk_Grupo_Mae`      (`rfc`),
  INDEX `idx_grupo_periodo`  (`id_periodo`),
  CONSTRAINT `fk_Grupo_Mat`
    FOREIGN KEY (`clave_materia`)  REFERENCES `materia`         (`clave_materia`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_Grupo_Mae`
    FOREIGN KEY (`rfc`)            REFERENCES `maestro`         (`rfc`)           ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_Grupo_Per`
    FOREIGN KEY (`id_periodo`)     REFERENCES `periodo_escolar` (`id_periodo`)    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Instancia de una materia en un periodo impartida por un maestro';


-- Unidad (sin cambios)
CREATE TABLE `unidad` (
  `id_unidad`     INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `clave_materia` VARCHAR(15)   NOT NULL,
  `nombre_unidad` VARCHAR(100)  NOT NULL,
  PRIMARY KEY (`id_unidad`),
  INDEX `fk_Unidad_Mat` (`clave_materia`),
  CONSTRAINT `fk_Unidad_Mat`
    FOREIGN KEY (`clave_materia`) REFERENCES `materia` (`clave_materia`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='División de contenido de una materia';


-- Unidad-Tipo de actividad (sin cambios)
CREATE TABLE `unidad_tipo_actividad` (
  `id_unidad` INT UNSIGNED NOT NULL,
  `id_tipo`   INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id_unidad`, `id_tipo`),
  CONSTRAINT `fk_UTA_Unidad`
    FOREIGN KEY (`id_unidad`) REFERENCES `unidad`         (`id_unidad`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_UTA_Tipo`
    FOREIGN KEY (`id_tipo`)   REFERENCES `tipo_actividad` (`id_tipo`)   ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Tipos de actividad permitidos por unidad';


-- Actividades predefinidas por Admin (sin cambios)
CREATE TABLE `materia_actividad` (
  `id_mat_act`       INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `clave_materia`    VARCHAR(15)   NOT NULL,
  `id_unidad`        INT UNSIGNED  NOT NULL,
  `nombre_actividad` VARCHAR(100)  NOT NULL,
  `id_tipo`          INT UNSIGNED  NULL DEFAULT NULL,
  PRIMARY KEY (`id_mat_act`),
  INDEX `fk_MActiv_Mat`    (`clave_materia`),
  INDEX `fk_MActiv_Unidad` (`id_unidad`),
  INDEX `fk_MActiv_Tipo`   (`id_tipo`),
  CONSTRAINT `fk_MActiv_Mat`
    FOREIGN KEY (`clave_materia`) REFERENCES `materia`        (`clave_materia`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_MActiv_Unidad`
    FOREIGN KEY (`id_unidad`)     REFERENCES `unidad`         (`id_unidad`)     ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_MActiv_Tipo`
    FOREIGN KEY (`id_tipo`)       REFERENCES `tipo_actividad` (`id_tipo`)       ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Actividades definidas por Admin para cada materia';


-- Grupo-Unidad (sin cambios)
CREATE TABLE `grupo_unidad` (
  `id_grupo`      INT UNSIGNED NOT NULL,
  `id_unidad`     INT UNSIGNED NOT NULL,
  `ponderacion`   DECIMAL(5,2) NOT NULL DEFAULT 0,
  `agrupacion_id` TINYINT UNSIGNED NULL DEFAULT NULL,
  `tipo_config`   ENUM('original','fusionada','dividida') NOT NULL DEFAULT 'original',
  PRIMARY KEY (`id_grupo`, `id_unidad`),
  INDEX `fk_GU_Unidad` (`id_unidad`),
  CONSTRAINT `fk_GU_Grupo`
    FOREIGN KEY (`id_grupo`)  REFERENCES `grupo`  (`id_grupo`)  ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_GU_Unidad`
    FOREIGN KEY (`id_unidad`) REFERENCES `unidad` (`id_unidad`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB
  COMMENT='Peso de cada unidad dentro de un grupo específico';


-- ─────────────────────────────────────────────────────────────────────────────
--  CORRECCIÓN — Actividad
--  Se agrega FK hacia grupo_unidad(id_grupo, id_unidad) para garantizar
--  que no existan actividades en pares grupo-unidad no configurados.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE `actividad` (
  `id_actividad`      INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `id_grupo`          INT UNSIGNED  NOT NULL,
  `id_unidad`         INT UNSIGNED  NOT NULL,
  `id_tipo_actividad` INT UNSIGNED  NULL DEFAULT NULL,
  `nombre_actividad`  VARCHAR(100)  NOT NULL,
  `ponderacion`       DECIMAL(5,2)  NOT NULL
    COMMENT 'Porcentaje (0-100); suma por (id_grupo, id_unidad) = 100',
  `tipo_evaluacion`   ENUM('Formativa','Sumativa','Diagnóstica') NOT NULL DEFAULT 'Sumativa',
  `estatus`           ENUM('Pendiente','Calificada','Cerrada') NOT NULL DEFAULT 'Pendiente',
  `fecha_entrega`     DATE          NULL DEFAULT NULL,
  `bloqueado`         TINYINT(1)    NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_actividad`),
  INDEX `fk_Activ_GrupoUnidad` (`id_grupo`, `id_unidad`),
  INDEX `fk_Activ_Tipo`        (`id_tipo_actividad`),
  CONSTRAINT `fk_Activ_GrupoUnidad`
    FOREIGN KEY (`id_grupo`, `id_unidad`) REFERENCES `grupo_unidad` (`id_grupo`, `id_unidad`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_Activ_Tipo`
    FOREIGN KEY (`id_tipo_actividad`) REFERENCES `tipo_actividad` (`id_tipo`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Elemento evaluable definido por el Maestro para un grupo-unidad';


-- ─────────────────────────────────────────────────────────────────────────────
--  CORRECCIÓN 3NF — Config evaluación por unidad
--  Se elimina cal_examen: es una calificación que ya existe en
--  resultado_actividad (o se puede derivar de ella). Almacenarla aquí
--  crea una dependencia transitiva y produce inconsistencias.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE `config_evaluacion_unidad` (
  `id_grupo`        INT UNSIGNED NOT NULL,
  `id_unidad`       INT UNSIGNED NOT NULL,
  `pct_actividades` DECIMAL(5,2) NOT NULL DEFAULT 60.00,
  `pct_examen`      DECIMAL(5,2) NOT NULL DEFAULT 30.00,
  `pct_asistencia`  DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  -- `cal_examen` ELIMINADO — obtener de resultado_actividad (3NF)
  `nota`            VARCHAR(255) NULL DEFAULT NULL,
  `fecha_config`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_grupo`, `id_unidad`),
  CONSTRAINT `fk_CEU_Grupo`
    FOREIGN KEY (`id_grupo`)  REFERENCES `grupo`  (`id_grupo`)  ON DELETE CASCADE,
  CONSTRAINT `fk_CEU_Unidad`
    FOREIGN KEY (`id_unidad`) REFERENCES `unidad` (`id_unidad`) ON DELETE CASCADE
) ENGINE=InnoDB
  COMMENT='Distribución porcentual de rubros por grupo-unidad';


-- Inscripción (sin cambios)
CREATE TABLE `inscripcion` (
  `no_control`        VARCHAR(15)  NOT NULL,
  `id_grupo`         INT UNSIGNED NOT NULL,
  `fecha_inscripcion` DATE         NOT NULL,
  `estatus`          ENUM('Cursando','Baja','Aprobado','Reprobado') NOT NULL DEFAULT 'Cursando',
  `tipo_curso`       ENUM('Ordinario','Recursado','Especial')       NOT NULL DEFAULT 'Ordinario',
  PRIMARY KEY (`no_control`, `id_grupo`),
  INDEX `fk_Inscr_Grupo` (`id_grupo`),
  CONSTRAINT `fk_Inscr_Alumno`
    FOREIGN KEY (`no_control`) REFERENCES `alumno` (`no_control`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_Inscr_Grupo`
    FOREIGN KEY (`id_grupo`)   REFERENCES `grupo`  (`id_grupo`)  ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Relación alumno-grupo';


-- Resultado por actividad (sin cambios)
CREATE TABLE `resultado_actividad` (
  `no_control`             VARCHAR(15)  NOT NULL,
  `id_actividad`          INT UNSIGNED NOT NULL,
  `calificacion_obtenida` DECIMAL(5,2) NULL DEFAULT NULL,
  `calificacion_anterior` DECIMAL(5,2) NULL DEFAULT NULL,
  `fecha_registro`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `estatus`               ENUM('Pendiente','Validada','NP') NOT NULL DEFAULT 'Pendiente',
  `rfc`                   VARCHAR(13)  NOT NULL,
  PRIMARY KEY (`no_control`, `id_actividad`),
  INDEX `fk_RA_Actividad` (`id_actividad`),
  INDEX `fk_RA_Maestro`   (`rfc`),
  CONSTRAINT `fk_RA_Alumno`
    FOREIGN KEY (`no_control`)   REFERENCES `alumno`    (`no_control`)    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_RA_Actividad`
    FOREIGN KEY (`id_actividad`) REFERENCES `actividad` (`id_actividad`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_RA_Maestro`
    FOREIGN KEY (`rfc`)          REFERENCES `maestro`   (`rfc`)          ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Calificación individual del alumno por actividad';


-- Calificación por unidad (sin cambios)
CREATE TABLE `calificacion_unidad` (
  `no_control`                VARCHAR(15)  NOT NULL,
  `id_unidad`                INT UNSIGNED NOT NULL,
  `id_grupo`                 INT UNSIGNED NOT NULL,
  `promedio_ponderado`       DECIMAL(5,2) NULL DEFAULT NULL,
  `calificacion_unidad_final` DECIMAL(5,2) NULL DEFAULT NULL,
  `estatus_unidad`           ENUM('Pendiente','Aprobada','Reprobada') NOT NULL DEFAULT 'Pendiente',
  PRIMARY KEY (`no_control`, `id_unidad`, `id_grupo`),
  INDEX `fk_CU_Unidad` (`id_unidad`),
  INDEX `fk_CU_Grupo`  (`id_grupo`),
  CONSTRAINT `fk_CU_Alumno`
    FOREIGN KEY (`no_control`) REFERENCES `alumno`  (`no_control`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_CU_Unidad`
    FOREIGN KEY (`id_unidad`) REFERENCES `unidad`  (`id_unidad`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_CU_Grupo`
    FOREIGN KEY (`id_grupo`)  REFERENCES `grupo`   (`id_grupo`)  ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Promedio de unidad por alumno (caché)';


-- Calificación final (sin cambios)
CREATE TABLE `calificacion_final` (
  `no_control`            VARCHAR(15)  NOT NULL,
  `id_grupo`             INT UNSIGNED NOT NULL,
  `promedio_unidades`    DECIMAL(5,2) NULL DEFAULT NULL,
  `calificacion_oficial` DECIMAL(5,2) NULL DEFAULT NULL,
  `estatus_final`        ENUM('Pendiente','Aprobado','Reprobado','Especial') NOT NULL DEFAULT 'Pendiente',
  PRIMARY KEY (`no_control`, `id_grupo`),
  INDEX `fk_CF_Grupo` (`id_grupo`),
  CONSTRAINT `fk_CF_Alumno`
    FOREIGN KEY (`no_control`) REFERENCES `alumno` (`no_control`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_CF_Grupo`
    FOREIGN KEY (`id_grupo`)   REFERENCES `grupo`  (`id_grupo`)  ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Calificación final del alumno en el grupo';


-- Bonus por unidad (sin cambios)
CREATE TABLE `bonusunidad` (
  `no_control`          VARCHAR(15)  NOT NULL,
  `id_unidad`          INT UNSIGNED NOT NULL,
  `id_grupo`           INT UNSIGNED NOT NULL,
  `rfc`                VARCHAR(13)  NOT NULL,
  `puntos_otorgados`   DECIMAL(4,2) NOT NULL,
  `justificacion`      TEXT         NOT NULL,
  `fecha_asignacion`   DATE         NOT NULL DEFAULT (CURDATE()),
  `fecha_modificacion` DATE         NULL DEFAULT NULL,
  `estatus`            ENUM('Activo','Cancelado') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`no_control`, `id_unidad`, `id_grupo`),
  INDEX `fk_BU_Unidad`  (`id_unidad`),
  INDEX `fk_BU_Grupo`   (`id_grupo`),
  INDEX `fk_BU_Maestro` (`rfc`),
  CONSTRAINT `fk_BU_Alumno`
    FOREIGN KEY (`no_control`) REFERENCES `alumno`  (`no_control`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_BU_Unidad`
    FOREIGN KEY (`id_unidad`)  REFERENCES `unidad`  (`id_unidad`)  ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_BU_Grupo`
    FOREIGN KEY (`id_grupo`)   REFERENCES `grupo`   (`id_grupo`)   ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_BU_Maestro`
    FOREIGN KEY (`rfc`)        REFERENCES `maestro` (`rfc`)        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Puntos adicionales por unidad';


-- Bonus final (sin cambios)
CREATE TABLE `bonusfinal` (
  `no_control`          VARCHAR(15)  NOT NULL,
  `id_grupo`           INT UNSIGNED NOT NULL,
  `rfc`                VARCHAR(13)  NOT NULL,
  `puntos_otorgados`   DECIMAL(4,2) NOT NULL,
  `justificacion`      TEXT         NOT NULL,
  `fecha_asignacion`   DATE         NOT NULL DEFAULT (CURDATE()),
  `fecha_modificacion` DATE         NULL DEFAULT NULL,
  `estatus`            ENUM('Activo','Aplicado') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`no_control`, `id_grupo`),
  INDEX `fk_BF_Maestro` (`rfc`),
  CONSTRAINT `fk_BF_CalFinal`
    FOREIGN KEY (`no_control`, `id_grupo`) REFERENCES `calificacion_final` (`no_control`, `id_grupo`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_BF_Maestro`
    FOREIGN KEY (`rfc`) REFERENCES `maestro` (`rfc`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Puntos adicionales a nivel materia';


-- ─────────────────────────────────────────────────────────────────────────────
--  CORRECCIÓN DISEÑO — Modificación final
--  La PK compuesta (no_control, id_grupo) solo permitía UNA modificación
--  por alumno-grupo. Se agrega id_modificacion como PK auto-incremental.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE `modificacionfinal` (
  `id_modificacion`     INT UNSIGNED NOT NULL AUTO_INCREMENT
    COMMENT 'PK — permite múltiples modificaciones por alumno-grupo',
  `no_control`          VARCHAR(15)  NOT NULL,
  `id_grupo`           INT UNSIGNED NOT NULL,
  `rfc`                VARCHAR(13)  NOT NULL,
  `calif_original`     DECIMAL(5,2) NOT NULL,
  `calif_modificada`   DECIMAL(5,2) NOT NULL,
  `justificacion`      TEXT         NOT NULL,
  `fecha_modificacion` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `estatus`            ENUM('Aplicado','Auditado') NOT NULL DEFAULT 'Aplicado',
  PRIMARY KEY (`id_modificacion`),
  INDEX `fk_MF_AlumnoGrupo` (`no_control`, `id_grupo`),
  INDEX `fk_MF_Maestro`     (`rfc`),
  CONSTRAINT `fk_MF_CalFinal`
    FOREIGN KEY (`no_control`, `id_grupo`) REFERENCES `calificacion_final` (`no_control`, `id_grupo`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_MF_Maestro`
    FOREIGN KEY (`rfc`) REFERENCES `maestro` (`rfc`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Historial de ajustes manuales del docente sobre la calificación final';


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
--  SISTEMA DE ESTATUS AUTOMÁTICO — periodo_escolar
-- ─────────────────────────────────────────────────────────────────────────────

-- Actualización inicial al ejecutar el script
-- (aplica el estatus correcto con base en la fecha de hoy)
UPDATE periodo_escolar
SET estatus =
  CASE
    WHEN CURDATE() < fecha_inicio THEN 'Proximo'
    WHEN CURDATE() BETWEEN fecha_inicio AND fecha_fin THEN 'Vigente'
    WHEN CURDATE() > fecha_fin THEN 'Concluido'
  END
WHERE override_manual = 0;


-- Evento automático diario
-- Recalcula el estatus de todos los periodos sin override manual
DROP EVENT IF EXISTS evt_actualizar_estatus_periodos;

CREATE EVENT evt_actualizar_estatus_periodos
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
  UPDATE periodo_escolar
  SET estatus =
    CASE
      WHEN CURDATE() < fecha_inicio THEN 'Proximo'
      WHEN CURDATE() BETWEEN fecha_inicio AND fecha_fin THEN 'Vigente'
      WHEN CURDATE() > fecha_fin THEN 'Concluido'
    END
  WHERE override_manual = 0;


-- ─────────────────────────────────────────────────────────────────────────────
--  PROCEDIMIENTOS — Control manual de estatus
-- ─────────────────────────────────────────────────────────────────────────────

DROP PROCEDURE IF EXISTS cambiar_estatus_periodo;

DELIMITER //

-- Cambia el estatus manualmente y activa el override
-- para que el scheduler no lo sobreescriba
-- Uso: CALL cambiar_estatus_periodo(2, 'Concluido');
CREATE PROCEDURE cambiar_estatus_periodo(
  IN p_id_periodo INT UNSIGNED,
  IN p_estatus    VARCHAR(20)
)
BEGIN
  UPDATE periodo_escolar
  SET estatus         = p_estatus,
      override_manual = 1
  WHERE id_periodo = p_id_periodo;
END //

DELIMITER ;


DROP PROCEDURE IF EXISTS quitar_override_periodo;

DELIMITER //

-- Regresa el periodo al control automático y recalcula
-- su estatus de inmediato con base en la fecha actual
-- Uso: CALL quitar_override_periodo(2);
CREATE PROCEDURE quitar_override_periodo(
  IN p_id_periodo INT UNSIGNED
)
BEGIN
  UPDATE periodo_escolar
  SET override_manual = 0,
      estatus =
        CASE
          WHEN CURDATE() < fecha_inicio THEN 'Proximo'
          WHEN CURDATE() BETWEEN fecha_inicio AND fecha_fin THEN 'Vigente'
          WHEN CURDATE() > fecha_fin THEN 'Concluido'
        END
  WHERE id_periodo = p_id_periodo;
END //

DELIMITER ;


-- ─────────────────────────────────────────────────────────────────────────────
--  PATCH: Cambiar username de alumnos a su número de control
--  Ejecutar UNA VEZ si ya tienes datos en la BD
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE usuario
SET username = id_referencia
WHERE rol = 'alumno';

-- Verificar resultado
SELECT username, id_referencia, rol
FROM usuario
WHERE rol = 'alumno';


-- ─────────────────────────────────────────────────────────────────────────────
--  RESTAURAR MODOS
-- ─────────────────────────────────────────────────────────────────────────────
SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;


-- ============================================================
--  FIN DEL ESQUEMA v7 + PERIODOS AUTOMÁTICOS
--
--  RESUMEN DE CAMBIOS DE NORMALIZACIÓN (heredados de v7):
--  direccion de maestro y alumno se mantiene como VARCHAR(200) simple
--  3NF  periodo_escolar     → eliminado `anio` (derivado de fecha_inicio)
--  3NF  config_eval_unidad  → eliminado `cal_examen` (en resultado_actividad)
--  DIS  modificacionfinal   → nueva PK auto-incremental (múltiples por par)
--  REF  actividad           → nueva FK hacia grupo_unidad(id_grupo,id_unidad)
--
--  NUEVO EN ESTE ARCHIVO:
--  +    periodo_escolar     → columna override_manual TINYINT(1) DEFAULT 0
--  +    evt_actualizar_estatus_periodos → evento diario automático
--  +    cambiar_estatus_periodo()       → cambio manual con override
--  +    quitar_override_periodo()       → regresa al control automático
-- ============================================================
