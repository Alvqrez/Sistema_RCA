-- ============================================================
--  Sistema de Registro y Cálculo de Resultados Académicos
--  Modelo Relacional — MySQL Workbench
--  Instituto Tecnológico de Veracruz
-- ============================================================

-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------
-- -----------------------------------------------------
-- Schema rca_sistema
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema rca_sistema
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `rca_sistema` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci ;
USE `rca_sistema` ;

-- -----------------------------------------------------
-- Table `rca_sistema`.`maestro`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `rca_sistema`.`maestro` (
  `numero_empleado` VARCHAR(15) NOT NULL COMMENT 'Identificador único del docente',
  `nombre` VARCHAR(80) NOT NULL,
  `apellido_paterno` VARCHAR(50) NOT NULL,
  `apellido_materno` VARCHAR(50) NOT NULL,
  `curp` CHAR(18) NOT NULL,
  `rfc` VARCHAR(13) NULL DEFAULT NULL,
  `fecha_nacimiento` DATE NULL DEFAULT NULL,
  `genero` ENUM('M', 'F', 'Otro') NULL DEFAULT NULL,
  `correo_institucional` VARCHAR(100) NOT NULL,
  `correo_personal` VARCHAR(100) NULL DEFAULT NULL,
  `tel_celular` VARCHAR(15) NULL DEFAULT NULL,
  `tel_oficina` VARCHAR(15) NULL DEFAULT NULL,
  `direccion` VARCHAR(200) NULL DEFAULT NULL,
  `tipo_contrato` VARCHAR(40) NULL DEFAULT NULL COMMENT 'Ej. Tiempo completo, Hora-semana-mes',
  `estatus` ENUM('Activo', 'Licencia', 'Inactivo') NOT NULL DEFAULT 'Activo',
  `fecha_ingreso` DATE NULL DEFAULT NULL,
  `grado_academico` VARCHAR(40) NULL DEFAULT NULL COMMENT 'Ej. Maestría, Doctorado',
  `especialidad` VARCHAR(100) NULL DEFAULT NULL,
  `departamento` VARCHAR(80) NULL DEFAULT NULL,
  `usuario` VARCHAR(50) NULL DEFAULT NULL,
  `password` VARCHAR(255) NULL DEFAULT NULL,
  PRIMARY KEY (`numero_empleado`),
  UNIQUE INDEX `uq_Maestro_CURP` (`curp` ASC) VISIBLE,
  UNIQUE INDEX `usuario` (`usuario` ASC) VISIBLE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_spanish_ci
COMMENT = 'Docente que imparte grupos';


-- -----------------------------------------------------
-- Table `rca_sistema`.`materia`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `rca_sistema`.`materia` (
  `clave_materia` VARCHAR(15) NOT NULL COMMENT 'Clave alfanumérica oficial de la asignatura',
  `nombre_materia` VARCHAR(100) NOT NULL,
  `caracterizacion` TEXT NULL DEFAULT NULL,
  `creditos_totales` TINYINT UNSIGNED NOT NULL DEFAULT '0',
  `horas_teoricas` TINYINT UNSIGNED NOT NULL DEFAULT '0',
  `horas_practicas` TINYINT UNSIGNED NOT NULL DEFAULT '0',
  `no_unidades` TINYINT UNSIGNED NOT NULL DEFAULT '0' COMMENT 'Total de unidades que integran la materia — ERROR 17 corregido',
  PRIMARY KEY (`clave_materia`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_spanish_ci
COMMENT = 'Asignatura del plan de estudios';


-- -----------------------------------------------------
-- Table `rca_sistema`.`periodo_escolar`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `rca_sistema`.`periodo_escolar` (
  `id_periodo` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `descripcion` VARCHAR(60) NOT NULL COMMENT 'Ej. Enero-Junio 2025',
  `anio` YEAR NOT NULL,
  `fecha_inicio` DATE NOT NULL,
  `fecha_fin` DATE NOT NULL,
  `estatus` ENUM('Vigente', 'Concluido', 'Proximo') NOT NULL DEFAULT 'Proximo',
  PRIMARY KEY (`id_periodo`))
ENGINE = InnoDB
AUTO_INCREMENT = 2
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_spanish_ci
COMMENT = 'Ciclo académico semestral';


-- -----------------------------------------------------
-- Table `rca_sistema`.`grupo`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `rca_sistema`.`grupo` (
  `id_grupo` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `clave_materia` VARCHAR(15) NOT NULL COMMENT 'FK → Materia',
  `numero_empleado` VARCHAR(15) NOT NULL COMMENT 'FK → Maestro',
  `id_periodo` INT UNSIGNED NOT NULL COMMENT 'FK → PeriodoEscolar',
  `limite_alumnos` TINYINT UNSIGNED NOT NULL DEFAULT '30',
  `horario` VARCHAR(100) NULL DEFAULT NULL,
  `aula` VARCHAR(40) NULL DEFAULT NULL,
  `estatus` ENUM('Activo', 'Cerrado', 'Cancelado') NOT NULL DEFAULT 'Activo' COMMENT 'Estado propio del grupo',
  PRIMARY KEY (`id_grupo`),
  INDEX `fk_Grupo_Mat` (`clave_materia` ASC) VISIBLE,
  INDEX `fk_Grupo_Mae` (`numero_empleado` ASC) VISIBLE,
  INDEX `fk_Grupo_Per` (`id_periodo` ASC) VISIBLE,
  CONSTRAINT `fk_Grupo_Mae`
    FOREIGN KEY (`numero_empleado`)
    REFERENCES `rca_sistema`.`maestro` (`numero_empleado`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_Grupo_Mat`
    FOREIGN KEY (`clave_materia`)
    REFERENCES `rca_sistema`.`materia` (`clave_materia`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_Grupo_Per`
    FOREIGN KEY (`id_periodo`)
    REFERENCES `rca_sistema`.`periodo_escolar` (`id_periodo`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_spanish_ci
COMMENT = 'Instancia de una materia en un periodo impartida por un maestro';


-- -----------------------------------------------------
-- Table `rca_sistema`.`unidad`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `rca_sistema`.`unidad` (
  `id_unidad` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `clave_materia` VARCHAR(15) NOT NULL COMMENT 'FK → Materia',
  `nombre_unidad` VARCHAR(100) NOT NULL,
  `temario` TEXT NULL DEFAULT NULL,
  `estatus` ENUM('Pendiente', 'En curso', 'Cerrada') NOT NULL DEFAULT 'Pendiente',
  `fecha_cierre` DATE NULL DEFAULT NULL COMMENT 'Fecha límite en que concluyó la unidad',
  PRIMARY KEY (`id_unidad`),
  INDEX `fk_Unidad_Mat` (`clave_materia` ASC) VISIBLE,
  CONSTRAINT `fk_Unidad_Mat`
    FOREIGN KEY (`clave_materia`)
    REFERENCES `rca_sistema`.`materia` (`clave_materia`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_spanish_ci
COMMENT = 'División de contenido dentro de una materia (compartida entre grupos)';


-- -----------------------------------------------------
-- Table `rca_sistema`.`actividad`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `rca_sistema`.`actividad` (
  `id_actividad` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_grupo` INT UNSIGNED NOT NULL COMMENT 'FK → Grupo',
  `id_unidad` INT UNSIGNED NOT NULL COMMENT 'FK → Unidad',
  `nombre_actividad` VARCHAR(100) NOT NULL,
  `ponderacion` DECIMAL(5,2) NOT NULL COMMENT 'Porcentaje (0-100); suma por (IdGrupo,IdUnidad) = 100',
  `tipo_evaluacion` ENUM('Formativa', 'Sumativa', 'Diagnóstica') NOT NULL DEFAULT 'Sumativa',
  `estatus` ENUM('Pendiente', 'Calificada', 'Cerrada') NOT NULL DEFAULT 'Pendiente',
  `fecha_entrega` DATE NULL DEFAULT NULL,
  `bloqueado` TINYINT(1) NOT NULL DEFAULT '0' COMMENT '1=bloqueada',
  PRIMARY KEY (`id_actividad`),
  INDEX `fk_Activ_Grupo` (`id_grupo` ASC) VISIBLE,
  INDEX `fk_Activ_Unidad` (`id_unidad` ASC) VISIBLE,
  CONSTRAINT `fk_Activ_Grupo`
    FOREIGN KEY (`id_grupo`)
    REFERENCES `rca_sistema`.`grupo` (`id_grupo`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_Activ_Unidad`
    FOREIGN KEY (`id_unidad`)
    REFERENCES `rca_sistema`.`unidad` (`id_unidad`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_spanish_ci
COMMENT = 'Elemento evaluable definido por el docente para un grupo-unidad';


-- -----------------------------------------------------
-- Table `rca_sistema`.`administrador`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `rca_sistema`.`administrador` (
  `id_admin` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(80) NOT NULL,
  `apellido_paterno` VARCHAR(50) NOT NULL,
  `apellido_materno` VARCHAR(50) NULL DEFAULT NULL,
  `correo_institucional` VARCHAR(100) NOT NULL,
  `correo_personal` VARCHAR(100) NULL DEFAULT NULL,
  `tel_celular` VARCHAR(15) NULL DEFAULT NULL,
  `activo` TINYINT NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_admin`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_spanish_ci
COMMENT = 'Usuario con acceso administrativo al sistema';


-- -----------------------------------------------------
-- Table `rca_sistema`.`carrera`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `rca_sistema`.`carrera` (
  `id_carrera` VARCHAR(10) NOT NULL COMMENT 'Identificador único de la carrera (ej. ISC, IIA)',
  `nombre_carrera` VARCHAR(100) NOT NULL COMMENT 'Nombre oficial de la carrera',
  `siglas` VARCHAR(10) NULL DEFAULT NULL COMMENT 'Abreviatura oficial (ej. ISC)',
  `plan_estudios` VARCHAR(20) NULL DEFAULT NULL COMMENT 'Clave SEP/TecNM del plan vigente',
  `modalidad` ENUM('Presencial', 'A distancia', 'Mixta') NULL DEFAULT 'Presencial',
  `total_semestres` TINYINT UNSIGNED NULL DEFAULT NULL COMMENT 'Número total de semestres del plan',
  `total_creditos` SMALLINT UNSIGNED NULL DEFAULT NULL COMMENT 'Créditos totales requeridos',
  PRIMARY KEY (`id_carrera`),
  UNIQUE INDEX `uq_Carrera_nombre` (`nombre_carrera` ASC) VISIBLE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_spanish_ci
COMMENT = 'Programa académico ofrecido por la institución';


-- -----------------------------------------------------
-- Table `rca_sistema`.`alumno`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `rca_sistema`.`alumno` (
  `matricula` VARCHAR(15) NOT NULL COMMENT 'Matrícula única del estudiante',
  `id_carrera` VARCHAR(10) NOT NULL COMMENT 'FK → Carrera',
  `nombre` VARCHAR(80) NOT NULL,
  `apellido_paterno` VARCHAR(50) NOT NULL,
  `apellido_materno` VARCHAR(50) NULL DEFAULT NULL,
  `curp` CHAR(18) NULL DEFAULT NULL,
  `fecha_nacimiento` DATE NULL DEFAULT NULL,
  `genero` ENUM('M', 'F', 'Otro') NULL DEFAULT NULL,
  `correo_institucional` VARCHAR(100) NOT NULL,
  `correo_personal` VARCHAR(100) NULL DEFAULT NULL,
  `tel_celular` VARCHAR(15) NULL DEFAULT NULL,
  `tel_casa` VARCHAR(15) NULL DEFAULT NULL,
  `direccion` VARCHAR(200) NULL DEFAULT NULL,
  `usuario` VARCHAR(50) NULL DEFAULT NULL,
  `password` VARCHAR(255) NULL DEFAULT NULL,
  PRIMARY KEY (`matricula`),
  UNIQUE INDEX `uq_Alumno_CURP` (`curp` ASC) VISIBLE,
  UNIQUE INDEX `usuario` (`usuario` ASC) VISIBLE,
  INDEX `fk_Alumno_Car` (`id_carrera` ASC) VISIBLE,
  CONSTRAINT `fk_Alumno_Car`
    FOREIGN KEY (`id_carrera`)
    REFERENCES `rca_sistema`.`carrera` (`id_carrera`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_spanish_ci
COMMENT = 'Estudiante inscrito en la institución';


-- -----------------------------------------------------
-- Table `rca_sistema`.`calificacion_final`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `rca_sistema`.`calificacion_final` (
  `matricula` VARCHAR(15) NOT NULL COMMENT 'PK/FK → Alumno',
  `id_grupo` INT UNSIGNED NOT NULL COMMENT 'PK/FK → Grupo',
  `promedio_unidades` DECIMAL(5,2) NULL DEFAULT NULL COMMENT 'Promedio aritmético de unidades',
  `calificacion_oficial` DECIMAL(5,2) NULL DEFAULT NULL COMMENT 'Nota asentada en acta',
  `estatus_final` ENUM('Pendiente', 'Aprobado', 'Reprobado', 'Especial') NOT NULL DEFAULT 'Pendiente',
  PRIMARY KEY (`matricula`, `id_grupo`),
  INDEX `fk_CF_Grupo` (`id_grupo` ASC) VISIBLE,
  CONSTRAINT `fk_CF_Alumno`
    FOREIGN KEY (`matricula`)
    REFERENCES `rca_sistema`.`alumno` (`matricula`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_CF_Grupo`
    FOREIGN KEY (`id_grupo`)
    REFERENCES `rca_sistema`.`grupo` (`id_grupo`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_spanish_ci
COMMENT = 'Calificación final del alumno en el grupo';


-- -----------------------------------------------------
-- Table `rca_sistema`.`bonusfinal`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `rca_sistema`.`bonusfinal` (
  `matricula` VARCHAR(15) NOT NULL COMMENT 'PK/FK → Alumno',
  `id_grupo` INT UNSIGNED NOT NULL COMMENT 'PK/FK → Grupo',
  `numero_empleado` VARCHAR(15) NOT NULL COMMENT 'FK → Maestro',
  `puntos_otorgados` DECIMAL(4,2) NOT NULL,
  `justificacion` TEXT NOT NULL,
  `fecha_asignacion` DATE NOT NULL,
  `fecha_modificacion` DATE NULL DEFAULT NULL,
  `estatus` ENUM('Activo', 'Aplicado') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`matricula`, `id_grupo`),
  INDEX `fk_BF_Maestro` (`numero_empleado` ASC) VISIBLE,
  CONSTRAINT `fk_BF_CalFinal`
    FOREIGN KEY (`matricula` , `id_grupo`)
    REFERENCES `rca_sistema`.`calificacion_final` (`matricula` , `id_grupo`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_BF_Maestro`
    FOREIGN KEY (`numero_empleado`)
    REFERENCES `rca_sistema`.`maestro` (`numero_empleado`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_spanish_ci
COMMENT = 'Puntos adicionales a nivel materia';


-- -----------------------------------------------------
-- Table `rca_sistema`.`bonusunidad`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `rca_sistema`.`bonusunidad` (
  `matricula` VARCHAR(15) NOT NULL COMMENT 'PK/FK → Alumno',
  `id_unidad` INT UNSIGNED NOT NULL COMMENT 'PK/FK → Unidad',
  `id_grupo` INT UNSIGNED NOT NULL COMMENT 'PK/FK → Grupo',
  `numero_empleado` VARCHAR(15) NOT NULL COMMENT 'FK → Maestro',
  `puntos_otorgados` DECIMAL(4,2) NOT NULL COMMENT 'Puntos extra (máx institucional)',
  `justificacion` TEXT NOT NULL COMMENT 'Obligatorio para transparencia',
  `fecha_asignacion` DATE NOT NULL,
  `fecha_modificacion` DATE NULL DEFAULT NULL,
  `estatus` ENUM('Activo', 'Cancelado') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`matricula`, `id_unidad`, `id_grupo`),
  INDEX `fk_BU_Unidad` (`id_unidad` ASC) VISIBLE,
  INDEX `fk_BU_Grupo` (`id_grupo` ASC) VISIBLE,
  INDEX `fk_BU_Maestro` (`numero_empleado` ASC) VISIBLE,
  CONSTRAINT `fk_BU_Alumno`
    FOREIGN KEY (`matricula`)
    REFERENCES `rca_sistema`.`alumno` (`matricula`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_BU_Grupo`
    FOREIGN KEY (`id_grupo`)
    REFERENCES `rca_sistema`.`grupo` (`id_grupo`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_BU_Maestro`
    FOREIGN KEY (`numero_empleado`)
    REFERENCES `rca_sistema`.`maestro` (`numero_empleado`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_BU_Unidad`
    FOREIGN KEY (`id_unidad`)
    REFERENCES `rca_sistema`.`unidad` (`id_unidad`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_spanish_ci
COMMENT = 'Puntos adicionales por unidad';


-- -----------------------------------------------------
-- Table `rca_sistema`.`calificacion_unidad`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `rca_sistema`.`calificacion_unidad` (
  `matricula` VARCHAR(15) NOT NULL COMMENT 'PK/FK → Alumno',
  `id_unidad` INT UNSIGNED NOT NULL COMMENT 'PK/FK → Unidad',
  `id_grupo` INT UNSIGNED NOT NULL COMMENT 'PK/FK → Grupo',
  `promedio_ponderado` DECIMAL(5,2) NULL DEFAULT NULL COMMENT 'Caché calculado de Σ(calif×peso)',
  `calificacion_unidad_final` DECIMAL(5,2) NULL DEFAULT NULL COMMENT 'Promedio + BonusUnidad',
  `estatus_unidad` ENUM('Pendiente', 'Aprobada', 'Reprobada') NOT NULL DEFAULT 'Pendiente',
  PRIMARY KEY (`matricula`, `id_unidad`, `id_grupo`),
  INDEX `fk_CU_Unidad` (`id_unidad` ASC) VISIBLE,
  INDEX `fk_CU_Grupo` (`id_grupo` ASC) VISIBLE,
  CONSTRAINT `fk_CU_Alumno`
    FOREIGN KEY (`matricula`)
    REFERENCES `rca_sistema`.`alumno` (`matricula`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_CU_Grupo`
    FOREIGN KEY (`id_grupo`)
    REFERENCES `rca_sistema`.`grupo` (`id_grupo`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_CU_Unidad`
    FOREIGN KEY (`id_unidad`)
    REFERENCES `rca_sistema`.`unidad` (`id_unidad`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_spanish_ci
COMMENT = 'Promedio de unidad por alumno (caché; recalcular al modificar Resultado_Actividad)';


-- -----------------------------------------------------
-- Table `rca_sistema`.`inscripcion`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `rca_sistema`.`inscripcion` (
  `matricula` VARCHAR(15) NOT NULL COMMENT 'FK → Alumno',
  `id_grupo` INT UNSIGNED NOT NULL COMMENT 'FK → Grupo',
  `fecha_inscripcion` DATE NOT NULL,
  `estatus` ENUM('Cursando', 'Baja', 'Aprobado', 'Reprobado') NOT NULL DEFAULT 'Cursando',
  `tipo_curso` ENUM('Ordinario', 'Recursado', 'Especial') NOT NULL DEFAULT 'Ordinario',
  PRIMARY KEY (`matricula`, `id_grupo`),
  INDEX `fk_Inscr_Grupo` (`id_grupo` ASC) VISIBLE,
  CONSTRAINT `fk_Inscr_Alumno`
    FOREIGN KEY (`matricula`)
    REFERENCES `rca_sistema`.`alumno` (`matricula`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_Inscr_Grupo`
    FOREIGN KEY (`id_grupo`)
    REFERENCES `rca_sistema`.`grupo` (`id_grupo`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_spanish_ci
COMMENT = 'Relación alumno-grupo';


-- -----------------------------------------------------
-- Table `rca_sistema`.`modificacionfinal`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `rca_sistema`.`modificacionfinal` (
  `matricula` VARCHAR(15) NOT NULL COMMENT 'PK/FK → Alumno',
  `id_grupo` INT UNSIGNED NOT NULL COMMENT 'PK/FK → Grupo',
  `numero_empleado` VARCHAR(15) NOT NULL COMMENT 'FK → Maestro',
  `calif_original` DECIMAL(5,2) NOT NULL COMMENT 'Nota antes del ajuste manual',
  `calif_modificada` DECIMAL(5,2) NOT NULL COMMENT 'Nueva nota definitiva',
  `justificacion` TEXT NOT NULL,
  `fecha_modificacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `estatus` ENUM('Aplicado', 'Auditado') NOT NULL DEFAULT 'Aplicado',
  PRIMARY KEY (`matricula`, `id_grupo`),
  INDEX `fk_MF_Maestro` (`numero_empleado` ASC) VISIBLE,
  CONSTRAINT `fk_MF_CalFinal`
    FOREIGN KEY (`matricula` , `id_grupo`)
    REFERENCES `rca_sistema`.`calificacion_final` (`matricula` , `id_grupo`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_MF_Maestro`
    FOREIGN KEY (`numero_empleado`)
    REFERENCES `rca_sistema`.`maestro` (`numero_empleado`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_spanish_ci
COMMENT = 'Ajuste manual del docente sobre la calificación final';


-- -----------------------------------------------------
-- Table `rca_sistema`.`resultado_actividad`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `rca_sistema`.`resultado_actividad` (
  `matricula` VARCHAR(15) NOT NULL COMMENT 'PK/FK → Alumno',
  `id_actividad` INT UNSIGNED NOT NULL COMMENT 'PK/FK → Actividad',
  `calificacion_obtenida` DECIMAL(5,2) NULL DEFAULT NULL COMMENT 'NULL = aún no registrada',
  `calificacion_anterior` DECIMAL(5,2) NULL DEFAULT NULL COMMENT 'Valor previo a la última modificación — ERROR 13',
  `fecha_registro` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `estatus` ENUM('Pendiente', 'Validada', 'NP') NOT NULL DEFAULT 'Pendiente' COMMENT 'NP = No Presentó (equivale a 0 en cálculo)',
  `numero_empleado` VARCHAR(15) NOT NULL COMMENT 'FK → Maestro — ERROR 14 corregido',
  PRIMARY KEY (`matricula`, `id_actividad`),
  INDEX `fk_RA_Actividad` (`id_actividad` ASC) VISIBLE,
  INDEX `fk_RA_Maestro` (`numero_empleado` ASC) VISIBLE,
  CONSTRAINT `fk_RA_Actividad`
    FOREIGN KEY (`id_actividad`)
    REFERENCES `rca_sistema`.`actividad` (`id_actividad`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_RA_Alumno`
    FOREIGN KEY (`matricula`)
    REFERENCES `rca_sistema`.`alumno` (`matricula`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_RA_Maestro`
    FOREIGN KEY (`numero_empleado`)
    REFERENCES `rca_sistema`.`maestro` (`numero_empleado`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_spanish_ci
COMMENT = 'Calificación individual del alumno por actividad';


-- -----------------------------------------------------
-- Table `rca_sistema`.`reticula`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `rca_sistema`.`reticula` (
  `clave_materia` VARCHAR(15) NOT NULL COMMENT 'FK → Materia',
  `id_carrera` VARCHAR(10) NOT NULL COMMENT 'FK → Carrera',
  `semestre` TINYINT UNSIGNED NOT NULL COMMENT 'Semestre del plan en que se cursa',
  `creditos` TINYINT UNSIGNED NOT NULL DEFAULT '0' COMMENT 'Créditos asignados a la materia en esta carrera',
  PRIMARY KEY (`clave_materia`, `id_carrera`),
  INDEX `fk_Reticula_Car` (`id_carrera` ASC) VISIBLE,
  CONSTRAINT `fk_Reticula_Car`
    FOREIGN KEY (`id_carrera`)
    REFERENCES `rca_sistema`.`carrera` (`id_carrera`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_Reticula_Mat`
    FOREIGN KEY (`clave_materia`)
    REFERENCES `rca_sistema`.`materia` (`clave_materia`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_spanish_ci
COMMENT = 'Entidad asociativa: relaciona Materia con Carrera';


-- -----------------------------------------------------
-- Table `rca_sistema`.`usuario`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `rca_sistema`.`usuario` (
  `id_usuario` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `pwd` VARCHAR(255) NOT NULL COMMENT 'Contraseña cifrada con BCrypt. Nunca texto plano.',
  `rol` ENUM('administrador', 'maestro', 'alumno') NOT NULL,
  `id_referencia` VARCHAR(20) NOT NULL COMMENT 'matricula si alumno, numero_empleado si maestro, id_admin si administrador',
  `activo` TINYINT NOT NULL DEFAULT '1',
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ultimo_acceso` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE INDEX `uq_usuario_username` (`username` ASC) VISIBLE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_spanish_ci
COMMENT = 'Autenticación y control de acceso. id_referencia apunta a Alumno, Maestro o Administrador según rol. Integridad referencial garantizada por trigger.';


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;


-- Correción 1
CREATE TABLE IF NOT EXISTS `rca_sistema`.`grupo_unidad` (
    `id_grupo`    INT UNSIGNED  NOT NULL COMMENT 'FK → Grupo',
    `id_unidad`   INT UNSIGNED  NOT NULL COMMENT 'FK → Unidad',
    `ponderacion` DECIMAL(5,2)  NOT NULL DEFAULT 0 
                  COMMENT 'Peso de esta unidad en la calificación final del grupo (suma debe ser 100)',
    PRIMARY KEY (`id_grupo`, `id_unidad`),
    CONSTRAINT `fk_GU_Grupo`  FOREIGN KEY (`id_grupo`)  REFERENCES `grupo`(`id_grupo`)  ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT `fk_GU_Unidad` FOREIGN KEY (`id_unidad`) REFERENCES `unidad`(`id_unidad`) ON UPDATE CASCADE ON DELETE RESTRICT
) COMMENT = 'Peso de cada unidad dentro de un grupo específico';

-- correción 2: ---
ALTER TABLE alumno DROP COLUMN usuario;

ALTER TABLE alumno DROP COLUMN password;

ALTER TABLE `rca_sistema`.`maestro`
  DROP COLUMN `usuario`,
  DROP COLUMN `password`;

-- correccion 3: --
ALTER TABLE grupo
    ADD CONSTRAINT uq_grupo_maestro_periodo
    UNIQUE (clave_materia, numero_empleado, id_periodo);

-- Correccion 4

ALTER TABLE grupo_unidad
    ADD COLUMN agrupacion_id   TINYINT UNSIGNED NULL DEFAULT NULL
        COMMENT 'NULL = unidad independiente. Mismo número = unidades fusionadas',
    ADD COLUMN tipo_config     ENUM('original','fusionada','dividida') NOT NULL DEFAULT 'original';

-- correccion 5

CREATE TABLE IF NOT EXISTS `rca_sistema`.`config_evaluacion_unidad` (
    `id_grupo`        INT UNSIGNED  NOT NULL,
    `id_unidad`       INT UNSIGNED  NOT NULL,
    `pct_actividades` DECIMAL(5,2)  NOT NULL DEFAULT 60.00
        COMMENT '% de la calificación que vienen de actividades registradas',
    `pct_examen`      DECIMAL(5,2)  NOT NULL DEFAULT 30.00
        COMMENT '% que corresponde al examen',
    `pct_asistencia`  DECIMAL(5,2)  NOT NULL DEFAULT 10.00
        COMMENT '% que corresponde a asistencia',
    `cal_examen`      DECIMAL(5,2)  NULL DEFAULT NULL
        COMMENT 'Calificación del examen — se llena por grupo (aplica a todos igual, o puede venir por alumno)',
    `nota`            VARCHAR(255)  NULL DEFAULT NULL,
    `fecha_config`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id_grupo`, `id_unidad`),
    CONSTRAINT `fk_CEU_Grupo`  FOREIGN KEY (`id_grupo`)  REFERENCES `grupo`(`id_grupo`)  ON DELETE CASCADE,
    CONSTRAINT `fk_CEU_Unidad` FOREIGN KEY (`id_unidad`) REFERENCES `unidad`(`id_unidad`) ON DELETE CASCADE
) COMMENT = 'Configuración de cómo califica el maestro cada unidad de cada grupo';



USE rca_sistema;

ALTER TABLE maestro
  MODIFY COLUMN curp CHAR(18) NULL DEFAULT NULL;

ALTER TABLE maestro
  MODIFY COLUMN apellido_materno VARCHAR(50) NULL DEFAULT NULL;


ALTER TABLE bonusunidad
  MODIFY COLUMN fecha_asignacion DATE NOT NULL DEFAULT (CURDATE());

ALTER TABLE bonusfinal
  MODIFY COLUMN fecha_asignacion DATE NOT NULL DEFAULT (CURDATE());


SELECT
  COLUMN_NAME,
  IS_NULLABLE,
  COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'rca_sistema'
  AND TABLE_NAME   = 'maestro'
  AND COLUMN_NAME IN ('curp', 'apellido_materno');
-- Esperado: IS_NULLABLE = 'YES' en ambos



-- MEGACORRECCION WE ----
USE rca_sistema;


ALTER TABLE maestro
    MODIFY COLUMN curp CHAR(18) NULL DEFAULT NULL;


ALTER TABLE maestro
    MODIFY COLUMN apellido_materno VARCHAR(50) NULL DEFAULT NULL;

ALTER TABLE maestro
    DROP COLUMN  usuario,
    DROP COLUMN  password;


ALTER TABLE periodo_escolar
    ADD UNIQUE INDEX uq_periodo_descripcion (descripcion);


ALTER TABLE grupo
    ADD INDEX idx_grupo_periodo (id_periodo),
    ADD INDEX idx_grupo_empleado (numero_empleado);


ALTER TABLE bonusunidad
    MODIFY COLUMN fecha_asignacion DATE NOT NULL DEFAULT (CURDATE());

ALTER TABLE bonusfinal
    MODIFY COLUMN fecha_asignacion DATE NOT NULL DEFAULT (CURDATE());

SELECT TABLE_NAME, COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'rca_sistema'
  AND TABLE_NAME = 'maestro'
  AND COLUMN_NAME IN ('curp', 'apellido_materno', 'usuario', 'password');