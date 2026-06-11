SET SQL_SAFE_UPDATES = 0;

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS,     UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE,
    SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

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


CREATE TABLE `maestro` (
  `rfc`                  VARCHAR(13)   NOT NULL  COMMENT 'RFC — Identificador único y username del docente',
  `nombre`               VARCHAR(80)   NOT NULL,
  `apellido_paterno`     VARCHAR(50)   NOT NULL,
  `apellido_materno`     VARCHAR(50)   NULL DEFAULT NULL,
  `curp`                 CHAR(18)      NULL DEFAULT NULL,
  `fecha_nacimiento`     DATE          NULL DEFAULT NULL,
  `correo_institucional` VARCHAR(100)  NOT NULL,
  `correo_personal`      VARCHAR(100)  NULL DEFAULT NULL,
  `tel_celular`          VARCHAR(15)   NULL DEFAULT NULL,
  PRIMARY KEY (`rfc`),
  UNIQUE INDEX `uq_Maestro_CURP` (`curp`)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Docente que imparte grupos';


CREATE TABLE `carrera` (
  `id_carrera`      VARCHAR(10)   NOT NULL,
  `nombre_carrera`  VARCHAR(100)  NOT NULL,
  `siglas`          VARCHAR(10)   NULL DEFAULT NULL,
  PRIMARY KEY (`id_carrera`),
  UNIQUE INDEX `uq_Carrera_nombre` (`nombre_carrera`)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Programa académico ofrecido por la institución';


CREATE TABLE `alumno` (
  `no_control`           VARCHAR(8)    NOT NULL,
  `id_carrera`           VARCHAR(10)   NOT NULL  COMMENT 'FK → Carrera',
  `nombre`               VARCHAR(80)   NOT NULL,
  `apellido_paterno`     VARCHAR(50)   NOT NULL,
  `apellido_materno`     VARCHAR(50)   NULL DEFAULT NULL,
  `curp`                 CHAR(18)      NULL DEFAULT NULL,
  `fecha_nacimiento`     DATE          NULL DEFAULT NULL,
  `correo_institucional` VARCHAR(100)  NOT NULL,
  `correo_personal`      VARCHAR(100)  NULL DEFAULT NULL,
  `tel_celular`          VARCHAR(15)   NULL DEFAULT NULL,
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

CREATE TABLE `periodo_escolar` (
  `id_periodo`   INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `descripcion`  VARCHAR(60)   NOT NULL  COMMENT 'Ej. Enero-Junio 2025',
  `fecha_inicio` DATE          NOT NULL,
  `fecha_fin`    DATE          NOT NULL,
  `estatus`      ENUM('Vigente','Concluido','Proximo') NOT NULL DEFAULT 'Proximo',
  PRIMARY KEY (`id_periodo`),
  UNIQUE INDEX `uq_periodo_desc_inicio` (`descripcion`, `fecha_inicio`)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Ciclo académico semestral con estatus automático por fecha';


CREATE TABLE `materia` (
  `clave_materia`  VARCHAR(15)      NOT NULL,
  `nombre_materia` VARCHAR(100)     NOT NULL,
  `no_unidades`    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`clave_materia`)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Asignatura del plan de estudios';


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
  COMMENT='Autenticación y control de acceso';

CREATE TABLE `tipo_actividad` (
  `id_tipo`     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre`      VARCHAR(80)  NOT NULL,
  `descripcion` VARCHAR(255) NULL DEFAULT NULL,
  PRIMARY KEY (`id_tipo`),
  UNIQUE INDEX `uq_tipo_nombre` (`nombre`)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Catálogo global de actividades evaluables';


-- ─────────────────────────────────────────────────────────────────────────────
--  TABLAS CON DEPENDENCIAS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE `reticula` (
  `clave_materia` VARCHAR(15)      NOT NULL,
  `id_carrera`    VARCHAR(10)      NOT NULL,
  `semestre`      TINYINT UNSIGNED NOT NULL,
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


CREATE TABLE `grupo` (
  `id_grupo`       INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `clave_materia`  VARCHAR(15)      NOT NULL,
  `rfc`            VARCHAR(13)      NOT NULL,
  `id_periodo`     INT UNSIGNED     NOT NULL,
  `limite_alumnos` TINYINT UNSIGNED NOT NULL DEFAULT 30,
  `estatus`        ENUM('Activo','Cerrado','Cancelado') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id_grupo`),
  INDEX `fk_Grupo_Mat`     (`clave_materia`),
  INDEX `fk_Grupo_Mae`     (`rfc`),
  INDEX `idx_grupo_periodo` (`id_periodo`),
  CONSTRAINT `fk_Grupo_Mat`
    FOREIGN KEY (`clave_materia`) REFERENCES `materia`         (`clave_materia`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_Grupo_Mae`
    FOREIGN KEY (`rfc`)           REFERENCES `maestro`         (`rfc`)           ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_Grupo_Per`
    FOREIGN KEY (`id_periodo`)    REFERENCES `periodo_escolar` (`id_periodo`)    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Instancia de una materia en un periodo impartida por un maestro';


CREATE TABLE `unidad` (
  `id_unidad`     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `clave_materia` VARCHAR(15)  NOT NULL,
  `nombre_unidad` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id_unidad`),
  INDEX `fk_Unidad_Mat` (`clave_materia`),
  CONSTRAINT `fk_Unidad_Mat`
    FOREIGN KEY (`clave_materia`) REFERENCES `materia` (`clave_materia`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='División de contenido de una materia';


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


CREATE TABLE `materia_actividad` (
  `id_mat_act`       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `clave_materia`    VARCHAR(15)  NOT NULL,
  `id_unidad`        INT UNSIGNED NOT NULL,
  `nombre_actividad` VARCHAR(100) NOT NULL,
  `id_tipo`          INT UNSIGNED NULL DEFAULT NULL,
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
  COMMENT='Actividades definidas por Admin por materia-unidad (legacy, en desuso)';


CREATE TABLE `grupo_unidad` (
  `id_grupo`    INT UNSIGNED NOT NULL,
  `id_unidad`   INT UNSIGNED NOT NULL,
  `tipo_config` ENUM('original','fusionada','dividida') NOT NULL DEFAULT 'original',
  PRIMARY KEY (`id_grupo`, `id_unidad`),
  INDEX `fk_GU_Unidad` (`id_unidad`),
  CONSTRAINT `fk_GU_Grupo`
    FOREIGN KEY (`id_grupo`)  REFERENCES `grupo`  (`id_grupo`)  ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_GU_Unidad`
    FOREIGN KEY (`id_unidad`) REFERENCES `unidad` (`id_unidad`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB
  COMMENT='Vincula grupos con sus unidades efectivas, considerando divisiones y fusiones.';




CREATE TABLE `grupo_unidad_layout` (
  `id_grupo`        INT UNSIGNED  NOT NULL,
  `id_unidad_real`  INT UNSIGNED  NOT NULL
    COMMENT 'FK a unidad — ID real creado al dividir o fusionar',
  `ids_origen`      VARCHAR(200)  NOT NULL
    COMMENT 'IDs originales separados por coma. Ej: "1" (division) o "1,2" (fusion)',
  `tipo`            ENUM('division_a','division_b','fusion') NOT NULL,
  PRIMARY KEY (`id_grupo`, `id_unidad_real`),
  INDEX `fk_GUL_Unidad` (`id_unidad_real`),
  CONSTRAINT `fk_GUL_Grupo`
    FOREIGN KEY (`id_grupo`)       REFERENCES `grupo`  (`id_grupo`)  ON DELETE CASCADE,
  CONSTRAINT `fk_GUL_Unidad`
    FOREIGN KEY (`id_unidad_real`) REFERENCES `unidad` (`id_unidad`) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Registra divisiones y fusiones de unidades por grupo. Permite trazabilidad y reversión.';

CREATE TABLE `actividad` (
  `id_actividad`      INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `id_grupo`          INT UNSIGNED  NOT NULL,
  `id_unidad`         INT UNSIGNED  NOT NULL,
  `id_tipo_actividad` INT UNSIGNED  NULL DEFAULT NULL,
  `ponderacion`       DECIMAL(5,2)  NOT NULL
    COMMENT 'Porcentaje (0-100); suma por (id_grupo, id_unidad) = 100',
  `estatus`           ENUM('Pendiente','Calificada','Cerrada')   NOT NULL DEFAULT 'Pendiente',
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

CREATE TABLE `config_evaluacion_unidad` (
  `id_grupo`        INT UNSIGNED NOT NULL,
  `id_unidad`       INT UNSIGNED NOT NULL,
  `pct_actividades` DECIMAL(5,2) NOT NULL DEFAULT 60.00,
  `pct_examen`      DECIMAL(5,2) NOT NULL DEFAULT 30.00,
  `pct_asistencia`  DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  `nota`            TEXT         NULL DEFAULT NULL,
  `fecha_config`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_grupo`, `id_unidad`),
  CONSTRAINT `fk_CEU_Grupo`
    FOREIGN KEY (`id_grupo`)  REFERENCES `grupo`  (`id_grupo`)  ON DELETE CASCADE,
  CONSTRAINT `fk_CEU_Unidad`
    FOREIGN KEY (`id_unidad`) REFERENCES `unidad` (`id_unidad`) ON DELETE CASCADE
) ENGINE=InnoDB
  COMMENT='Distribución porcentual de rubros por grupo-unidad';


CREATE TABLE `inscripcion` (
  `no_control`        VARCHAR(15)  NOT NULL,
  `id_grupo`          INT UNSIGNED NOT NULL,
  `fecha_inscripcion` DATE         NOT NULL,
  `estatus`           ENUM('Cursando','Baja','Aprobado','Reprobado') NOT NULL DEFAULT 'Cursando',
  `tipo_curso`        ENUM('Ordinario','Recursado','Especial')       NOT NULL DEFAULT 'Ordinario',
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


CREATE TABLE `resultado_actividad` (
  `no_control`             VARCHAR(15)  NOT NULL,
  `id_actividad`           INT UNSIGNED NOT NULL,
  `calificacion_obtenida`  DECIMAL(5,2) NULL DEFAULT NULL,
  `calificacion_anterior`  DECIMAL(5,2) NULL DEFAULT NULL,
  `fecha_registro`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `estatus`                ENUM('Pendiente','Validada','NP') NOT NULL DEFAULT 'Pendiente',
  `rfc`                    VARCHAR(13)  NOT NULL,
  PRIMARY KEY (`no_control`, `id_actividad`),
  INDEX `fk_RA_Actividad` (`id_actividad`),
  INDEX `fk_RA_Maestro`   (`rfc`),
  CONSTRAINT `fk_RA_Alumno`
    FOREIGN KEY (`no_control`)   REFERENCES `alumno`    (`no_control`)   ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_RA_Actividad`
    FOREIGN KEY (`id_actividad`) REFERENCES `actividad` (`id_actividad`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_RA_Maestro`
    FOREIGN KEY (`rfc`)          REFERENCES `maestro`   (`rfc`)          ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Calificación individual del alumno por actividad';


CREATE TABLE `calificacion_unidad` (
  `no_control`                VARCHAR(15)  NOT NULL,
  `id_unidad`                 INT UNSIGNED NOT NULL,
  `id_grupo`                  INT UNSIGNED NOT NULL,
  `promedio_ponderado`        DECIMAL(5,2) NULL DEFAULT NULL,
  `calificacion_unidad_final` DECIMAL(5,2) NULL DEFAULT NULL,
  `estatus_unidad`            ENUM('Pendiente','Aprobada','Reprobada') NOT NULL DEFAULT 'Pendiente',
  PRIMARY KEY (`no_control`, `id_unidad`, `id_grupo`),
  INDEX `fk_CU_Unidad`       (`id_unidad`),
  INDEX `fk_CU_Grupo`        (`id_grupo`),
  INDEX `idx_CU_nc_grupo`    (`no_control`, `id_grupo`),
  CONSTRAINT `fk_CU_Alumno`
    FOREIGN KEY (`no_control`) REFERENCES `alumno`  (`no_control`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_CU_Unidad`
    FOREIGN KEY (`id_unidad`)  REFERENCES `unidad`  (`id_unidad`)  ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_CU_Grupo`
    FOREIGN KEY (`id_grupo`)   REFERENCES `grupo`   (`id_grupo`)   ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci
  COMMENT='Promedio de unidad por alumno (caché)';


CREATE TABLE `calificacion_final` (
  `no_control`            VARCHAR(15)  NOT NULL,
  `id_grupo`              INT UNSIGNED NOT NULL,
  `promedio_unidades`     DECIMAL(5,2) NULL DEFAULT NULL,
  `calificacion_oficial`  DECIMAL(5,2) NULL DEFAULT NULL,
  `estatus_final`         ENUM('Pendiente','Aprobado','Reprobado','Especial') NOT NULL DEFAULT 'Pendiente',
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


CREATE TABLE `bonusunidad` (
  `no_control`          VARCHAR(15)  NOT NULL,
  `id_unidad`           INT UNSIGNED NOT NULL,
  `id_grupo`            INT UNSIGNED NOT NULL,
  `rfc`                 VARCHAR(13)  NOT NULL,
  `puntos_otorgados`    DECIMAL(4,2) NOT NULL,
  `fecha_asignacion`    DATE         NOT NULL DEFAULT (CURDATE()),
  `fecha_modificacion`  DATE         NULL DEFAULT NULL,
  `estatus`             ENUM('Activo','Cancelado') NOT NULL DEFAULT 'Activo',
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


CREATE TABLE `bonusfinal` (
  `no_control`          VARCHAR(15)  NOT NULL,
  `id_grupo`            INT UNSIGNED NOT NULL,
  `rfc`                 VARCHAR(13)  NOT NULL,
  `puntos_otorgados`    DECIMAL(4,2) NOT NULL,
  `fecha_asignacion`    DATE         NOT NULL DEFAULT (CURDATE()),
  `fecha_modificacion`  DATE         NULL DEFAULT NULL,
  `estatus`             ENUM('Activo','Aplicado') NOT NULL DEFAULT 'Activo',
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

CREATE TABLE `modificacionfinal` (
  `id_modificacion`    INT UNSIGNED NOT NULL AUTO_INCREMENT
    COMMENT 'PK — permite múltiples modificaciones por alumno-grupo',
  `no_control`         VARCHAR(15)  NOT NULL,
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
--  ESTATUS AUTOMÁTICO DE PERIODOS
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE `periodo_escolar`
SET estatus =
  CASE
    WHEN CURDATE() < fecha_inicio                        THEN 'Proximo'
    WHEN CURDATE() BETWEEN fecha_inicio AND fecha_fin    THEN 'Vigente'
    ELSE 'Concluido'
  END;

DROP EVENT IF EXISTS `evt_actualizar_estatus_periodos`;

CREATE EVENT `evt_actualizar_estatus_periodos`
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
  UPDATE `periodo_escolar`
  SET estatus =
    CASE
      WHEN CURDATE() < fecha_inicio                      THEN 'Proximo'
      WHEN CURDATE() BETWEEN fecha_inicio AND fecha_fin  THEN 'Vigente'
      ELSE 'Concluido'
    END;


-- ─────────────────────────────────────────────────────────────────────────────
--  RESTAURAR MODOS
-- ─────────────────────────────────────────────────────────────────────────────
SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;


-- ============================================================
--  FIN DEL ESQUEMA v14
--
--  CAMBIOS ACUMULADOS DESDE v1:
--  3NF  periodo_escolar          → eliminado `anio`
--  3NF  config_evaluacion_unidad → eliminado `cal_examen`
--  DIS  modificacionfinal        → PK auto-incremental
--  REF  actividad                → FK hacia grupo_unidad
--  v11  grupo                    → eliminados horario, aula
--  v14  maestro                  → eliminados 9 campos no usados
--  v14  alumno                   → eliminados genero, tel_casa, direccion
--  v14  materia                  → eliminados horas_teoricas, horas_practicas
--  v14  reticula                 → eliminado creditos
--  v14  tipo_actividad           → eliminado activo
--  v14  notificacion             → tabla eliminada por completo
-- ============================================================

-- ============================================================
-- Migración de seguridad v15
-- Corrección A-3: forzar cambio de contraseña en primer acceso
-- ============================================================
-- Ejecutar UNA sola vez en la base de datos de producción.
-- El campo primer_acceso = 1 indica que el usuario nunca ha
-- cambiado su contraseña desde que fue creada por el sistema.
-- ============================================================

ALTER TABLE usuario
  ADD COLUMN primer_acceso TINYINT(1) NOT NULL DEFAULT 1;

-- Marcar como ya cambiada a todos los usuarios existentes
-- (se asume que los administradores ya tienen contraseñas propias).
-- Si deseas que TODOS deban cambiarla, comenta esta línea.
UPDATE usuario SET primer_acceso = 0 WHERE activo = 1;

-- Solo dejar primer_acceso = 1 en cuentas de maestros recién importados
-- (ajusta el criterio según tu flujo de onboarding):
-- UPDATE usuario SET primer_acceso = 1 WHERE rol = 'maestro';
