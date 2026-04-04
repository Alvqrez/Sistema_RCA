-- ============================================================
--  Sistema de Registro y Cálculo de Resultados Académicos
--  Modelo Relacional — MySQL Workbench
--  Instituto Tecnológico de Veracruz
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP DATABASE IF EXISTS rca_sistema;
CREATE DATABASE rca_sistema
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_spanish_ci;
USE rca_sistema;

-- ============================================================
-- TABLA 1: Carrera
-- ============================================================
CREATE TABLE Carrera (
    IdCarrera        VARCHAR(10)  NOT NULL COMMENT 'Identificador único de la carrera (ej. ISC, IIA)',
    NombreCarrera    VARCHAR(100) NOT NULL COMMENT 'Nombre oficial de la carrera',
    Siglas           VARCHAR(10)  NOT NULL COMMENT 'Abreviatura oficial (ej. ISC)',
    PlanEstudios     VARCHAR(20)  NOT NULL COMMENT 'Clave SEP/TecNM del plan vigente',
    Modalidad        ENUM('Presencial','A distancia','Mixta') NOT NULL DEFAULT 'Presencial',
    Total_semestres  TINYINT UNSIGNED NOT NULL COMMENT 'Número total de semestres del plan',
    Total_creditos   SMALLINT UNSIGNED NOT NULL COMMENT 'Créditos totales requeridos',
    CONSTRAINT pk_Carrera PRIMARY KEY (IdCarrera),
    CONSTRAINT uq_Carrera_nombre UNIQUE (NombreCarrera)
) COMMENT = 'Programa académico ofrecido por la institución';

-- ============================================================
-- TABLA 2: Maestro
-- ============================================================
CREATE TABLE Maestro (
    NumeroEmpleado   VARCHAR(15)  NOT NULL COMMENT 'Identificador único del docente',
    Nombre           VARCHAR(80)  NOT NULL,
    ApellidoPaterno  VARCHAR(50)  NOT NULL,
    ApellidoMaterno  VARCHAR(50)  NOT NULL,
    CURP             CHAR(18)     NOT NULL,
    RFC              VARCHAR(13)  NOT NULL,
    FechaNacimiento  DATE         NOT NULL,
    Genero           ENUM('M','F','Otro') NOT NULL,
    CorreoInstitucional VARCHAR(100) NOT NULL,
    CorreoPersonal      VARCHAR(100),
    TelCelular          VARCHAR(15),
    TelOficina          VARCHAR(15),
    Direccion           VARCHAR(200),
    TipoContrato        VARCHAR(40) COMMENT 'Ej. Tiempo completo, Hora-semana-mes',
    Estatus             ENUM('Activo','Licencia','Inactivo') NOT NULL DEFAULT 'Activo',
    FechaIngreso        DATE,
    GradoAcademico      VARCHAR(40) COMMENT 'Ej. Maestría, Doctorado',
    Especialidad        VARCHAR(100),
    Departamento        VARCHAR(80),
    CONSTRAINT pk_Maestro PRIMARY KEY (NumeroEmpleado),
    CONSTRAINT uq_Maestro_CURP UNIQUE (CURP)
) COMMENT = 'Docente que imparte grupos';

-- ============================================================
-- TABLA 3: PeriodoEscolar
-- ============================================================
CREATE TABLE PeriodoEscolar (
    IdPeriodo    INT UNSIGNED NOT NULL AUTO_INCREMENT,
    Descripcion  VARCHAR(60)  NOT NULL COMMENT 'Ej. Enero-Junio 2025',
    Anio         YEAR         NOT NULL,
    FechaInicio  DATE         NOT NULL,
    FechaFin     DATE         NOT NULL,
    Estatus      ENUM('Vigente','Concluido','Proximo') NOT NULL DEFAULT 'Proximo',
    CONSTRAINT pk_PeriodoEscolar PRIMARY KEY (IdPeriodo),
    CONSTRAINT chk_Periodo_fechas CHECK (FechaFin > FechaInicio)
) COMMENT = 'Ciclo académico semestral';

-- ============================================================
-- TABLA 4: Materia
-- ============================================================
CREATE TABLE Materia (
    ClaveMateria     VARCHAR(15)  NOT NULL COMMENT 'Clave alfanumérica oficial de la asignatura',
    NombreMateria    VARCHAR(100) NOT NULL,
    Caracterizacion  TEXT,
    CreditosTotales  TINYINT UNSIGNED NOT NULL DEFAULT 0,
    HorasTeoricas    TINYINT UNSIGNED NOT NULL DEFAULT 0,
    HorasPracticas   TINYINT UNSIGNED NOT NULL DEFAULT 0,
    No_unidades      TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Total de unidades que integran la materia — ERROR 17 corregido',
    CONSTRAINT pk_Materia PRIMARY KEY (ClaveMateria)
) COMMENT = 'Asignatura del plan de estudios';

-- ============================================================
-- TABLA 5: Retícula
-- ============================================================
CREATE TABLE Reticula (
    ClaveMateria  VARCHAR(15)     NOT NULL COMMENT 'FK → Materia',
    IdCarrera     VARCHAR(10)     NOT NULL COMMENT 'FK → Carrera',
    Semestre      TINYINT UNSIGNED NOT NULL COMMENT 'Semestre del plan en que se cursa',
    Creditos      TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Créditos asignados a la materia en esta carrera',
    CONSTRAINT pk_Reticula      PRIMARY KEY  (ClaveMateria, IdCarrera),
    CONSTRAINT fk_Reticula_Mat  FOREIGN KEY  (ClaveMateria) REFERENCES Materia(ClaveMateria) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_Reticula_Car  FOREIGN KEY  (IdCarrera)    REFERENCES Carrera(IdCarrera) ON UPDATE CASCADE ON DELETE RESTRICT
) COMMENT = 'Entidad asociativa: relaciona Materia con Carrera';

-- ============================================================
-- TABLA 6: Alumno
-- ERROR 10 corregido: Alumno.IdCarrera → Carrera aparece como FK.
-- ============================================================
CREATE TABLE Alumno (
    NumeroControl       VARCHAR(15)  NOT NULL COMMENT 'Matrícula única del estudiante',
    IdCarrera           VARCHAR(10)  NOT NULL COMMENT 'FK → Carrera',
    Nombre              VARCHAR(80)  NOT NULL,
    ApellidoPaterno     VARCHAR(50)  NOT NULL,
    ApellidoMaterno     VARCHAR(50),
    CURP                CHAR(18)     NOT NULL,
    FechaNacimiento     DATE         NOT NULL,
    Genero              ENUM('M','F','Otro') NOT NULL,
    CorreoInstitucional VARCHAR(100) NOT NULL,
    CorreoPersonal      VARCHAR(100),
    TelCelular          VARCHAR(15),
    TelCasa             VARCHAR(15),
    Direccion           VARCHAR(200),
    CONSTRAINT pk_Alumno      PRIMARY KEY (NumeroControl),
    CONSTRAINT uq_Alumno_CURP UNIQUE (CURP),
    CONSTRAINT fk_Alumno_Car  FOREIGN KEY (IdCarrera) REFERENCES Carrera(IdCarrera) ON UPDATE CASCADE ON DELETE RESTRICT
) COMMENT = 'Estudiante inscrito en la institución';

-- ============================================================
-- TABLA 7: Grupo
-- ============================================================
CREATE TABLE Grupo (
    IdGrupo         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    ClaveMateria    VARCHAR(15)   NOT NULL COMMENT 'FK → Materia',
    NumeroEmpleado  VARCHAR(15)   NOT NULL COMMENT 'FK → Maestro',
    IdPeriodo       INT UNSIGNED  NOT NULL COMMENT 'FK → PeriodoEscolar',
    LimiteAlumnos   TINYINT UNSIGNED NOT NULL DEFAULT 30,
    Horario         VARCHAR(100),
    Aula            VARCHAR(40),
    Estatus         ENUM('Activo','Cerrado','Cancelado') NOT NULL DEFAULT 'Activo' COMMENT 'Estado propio del grupo',
    CONSTRAINT pk_Grupo     PRIMARY KEY (IdGrupo),
    CONSTRAINT fk_Grupo_Mat FOREIGN KEY (ClaveMateria)   REFERENCES Materia(ClaveMateria) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_Grupo_Mae FOREIGN KEY (NumeroEmpleado) REFERENCES Maestro(NumeroEmpleado) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_Grupo_Per FOREIGN KEY (IdPeriodo)      REFERENCES PeriodoEscolar(IdPeriodo) ON UPDATE CASCADE ON DELETE RESTRICT
) COMMENT = 'Instancia de una materia en un periodo impartida por un maestro';

-- ============================================================
-- TABLA 8: Unidad
-- ============================================================
CREATE TABLE Unidad (
    IdUnidad      INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    ClaveMateria  VARCHAR(15)   NOT NULL COMMENT 'FK → Materia',
    Nombre_unidad VARCHAR(100)  NOT NULL,
    Temario       TEXT,
    Estatus       ENUM('Pendiente','En curso','Cerrada') NOT NULL DEFAULT 'Pendiente',
    Fecha_cierre  DATE          COMMENT 'Fecha límite en que concluyó la unidad',
    CONSTRAINT pk_Unidad     PRIMARY KEY (IdUnidad),
    CONSTRAINT fk_Unidad_Mat FOREIGN KEY (ClaveMateria) REFERENCES Materia(ClaveMateria) ON UPDATE CASCADE ON DELETE RESTRICT
) COMMENT = 'División de contenido dentro de una materia (compartida entre grupos)';

-- ============================================================
-- TABLA 9: Actividad
-- ============================================================
CREATE TABLE Actividad (
    IdActividad      INT UNSIGNED NOT NULL AUTO_INCREMENT,
    IdGrupo          INT UNSIGNED NOT NULL COMMENT 'FK → Grupo',
    IdUnidad         INT UNSIGNED NOT NULL COMMENT 'FK → Unidad',
    NombreActividad  VARCHAR(100) NOT NULL,
    Ponderacion      DECIMAL(5,2) NOT NULL COMMENT 'Porcentaje (0-100); suma por (IdGrupo,IdUnidad) = 100',
    Tipo_evaluacion  ENUM('Formativa','Sumativa','Diagnóstica') NOT NULL DEFAULT 'Sumativa',
    Estatus          ENUM('Pendiente','Calificada','Cerrada') NOT NULL DEFAULT 'Pendiente',
    Fecha_entrega    DATE,
    Bloqueado        TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '1=bloqueada',
    CONSTRAINT pk_Actividad PRIMARY KEY (IdActividad),
    CONSTRAINT fk_Activ_Grupo FOREIGN KEY (IdGrupo)  REFERENCES Grupo(IdGrupo) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_Activ_Unidad FOREIGN KEY (IdUnidad) REFERENCES Unidad(IdUnidad) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_Ponderacion  CHECK (Ponderacion > 0 AND Ponderacion <= 100)
) COMMENT = 'Elemento evaluable definido por el docente para un grupo-unidad';

-- ============================================================
-- TABLA 10: Inscripcion
-- ============================================================
CREATE TABLE Inscripcion (
    NumeroControl 		VARCHAR(15)	 NOT NULL COMMENT 'FK → Alumno',
    IdGrupo 			INT UNSIGNED NOT NULL COMMENT 'FK → Grupo',
    Fecha_inscripcion 	DATE 	     NOT NULL,
    Estatus 			ENUM('Cursando','Baja','Aprobado','Reprobado') NOT NULL DEFAULT 'Cursando',
    Tipo_curso 			ENUM('Ordinario','Recursado','Especial') NOT NULL DEFAULT 'Ordinario',
    CONSTRAINT pk_Inscripcion PRIMARY KEY (NumeroControl, IdGrupo),
    CONSTRAINT fk_Inscr_Alumno FOREIGN KEY (NumeroControl) REFERENCES Alumno(NumeroControl) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_Inscr_Grupo FOREIGN KEY (IdGrupo) REFERENCES Grupo(IdGrupo) ON UPDATE CASCADE ON DELETE RESTRICT
) COMMENT = 'Relación alumno-grupo';

-- ============================================================
-- TABLA 11: Resultado_Actividad
-- ============================================================
CREATE TABLE Resultado_Actividad (
    Alumno_noControl 	  VARCHAR(15) 	NOT NULL COMMENT 'PK/FK → Alumno',
    Actividad_idActividad INT UNSIGNED	NOT NULL COMMENT 'PK/FK → Actividad',
    Calificacion_obtenida DECIMAL(5,2)    		 COMMENT 'NULL = aún no registrada',
    Calificacion_anterior DECIMAL(5,2)    		 COMMENT 'Valor previo a la última modificación — ERROR 13',
    Fecha_registro        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Estatus               ENUM('Pendiente','Validada','NP') NOT NULL DEFAULT 'Pendiente' COMMENT 'NP = No Presentó (equivale a 0 en cálculo)',
    NumeroEmpleado        VARCHAR(15)   NOT NULL COMMENT 'FK → Maestro — ERROR 14 corregido',
    CONSTRAINT pk_ResultAct PRIMARY KEY (Alumno_noControl, Actividad_idActividad),
    CONSTRAINT fk_RA_Alumno FOREIGN KEY (Alumno_noControl) REFERENCES Alumno(NumeroControl) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_RA_Actividad FOREIGN KEY (Actividad_idActividad) REFERENCES Actividad(IdActividad) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_RA_Maestro FOREIGN KEY (NumeroEmpleado) REFERENCES Maestro(NumeroEmpleado) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_CalifRA CHECK (Calificacion_obtenida IS NULL OR (Calificacion_obtenida >= 0 AND Calificacion_obtenida <= 100))
) COMMENT = 'Calificación individual del alumno por actividad';

-- ============================================================
-- TABLA 12: BonusUnidad
-- ============================================================
CREATE TABLE BonusUnidad (
    Alumno_noControl  VARCHAR(15)   NOT NULL COMMENT 'PK/FK → Alumno',
    IdUnidad          INT UNSIGNED  NOT NULL COMMENT 'PK/FK → Unidad',
    IdGrupo           INT UNSIGNED  NOT NULL COMMENT 'PK/FK → Grupo',
    NumeroEmpleado    VARCHAR(15)   NOT NULL COMMENT 'FK → Maestro',
    Puntos_otorgados  DECIMAL(4,2)  NOT NULL COMMENT 'Puntos extra (máx institucional)',
    Justificacion     TEXT          NOT NULL COMMENT 'Obligatorio para transparencia',
    Fecha_asignacion  DATE          NOT NULL,
    Fecha_modificacion DATE,
    Estatus           ENUM('Activo','Cancelado') NOT NULL DEFAULT 'Activo',
    CONSTRAINT pk_BonusUnidad PRIMARY KEY (Alumno_noControl, IdUnidad, IdGrupo),
    CONSTRAINT fk_BU_Alumno FOREIGN KEY (Alumno_noControl) REFERENCES Alumno(NumeroControl) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_BU_Unidad FOREIGN KEY (IdUnidad) REFERENCES Unidad(IdUnidad) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_BU_Grupo FOREIGN KEY (IdGrupo) REFERENCES Grupo(IdGrupo) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_BU_Maestro FOREIGN KEY (NumeroEmpleado) REFERENCES Maestro(NumeroEmpleado) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_BU_puntos CHECK (Puntos_otorgados >= 0 AND Puntos_otorgados <= 10)
) COMMENT = 'Puntos adicionales por unidad';

-- ============================================================
-- TABLA 13: Calificacion_Unidad
-- ============================================================
CREATE TABLE Calificacion_Unidad (
    Alumno_noControl        VARCHAR(15)   NOT NULL COMMENT 'PK/FK → Alumno',
    IdUnidad                INT UNSIGNED  NOT NULL COMMENT 'PK/FK → Unidad',
    IdGrupo                 INT UNSIGNED  NOT NULL COMMENT 'PK/FK → Grupo',
    Promedio_ponderado      DECIMAL(5,2)  COMMENT 'Caché calculado de Σ(calif×peso)',
    Calificacion_unidad_final DECIMAL(5,2) COMMENT 'Promedio + BonusUnidad',
    Estatus_unidad          ENUM('Pendiente','Aprobada','Reprobada') NOT NULL DEFAULT 'Pendiente',
    CONSTRAINT pk_CalUnidad PRIMARY KEY (Alumno_noControl, IdUnidad, IdGrupo),
    CONSTRAINT fk_CU_Alumno FOREIGN KEY (Alumno_noControl) REFERENCES Alumno(NumeroControl) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_CU_Unidad FOREIGN KEY (IdUnidad) REFERENCES Unidad(IdUnidad) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_CU_Grupo  FOREIGN KEY (IdGrupo) REFERENCES Grupo(IdGrupo) ON UPDATE CASCADE ON DELETE RESTRICT
) COMMENT = 'Promedio de unidad por alumno (caché; recalcular al modificar Resultado_Actividad)';

-- ============================================================
-- TABLA 14: Calificacion_Final
-- ============================================================
CREATE TABLE Calificacion_Final (
    Alumno_noControl   VARCHAR(15)   NOT NULL COMMENT 'PK/FK → Alumno',
    IdGrupo            INT UNSIGNED  NOT NULL COMMENT 'PK/FK → Grupo',
    Promedio_unidades  DECIMAL(5,2)  COMMENT 'Promedio aritmético de unidades',
    Calificacion_oficial DECIMAL(5,2) COMMENT 'Nota asentada en acta',
    Estatus_final      ENUM('Pendiente','Aprobado','Reprobado','Especial') NOT NULL DEFAULT 'Pendiente',
    CONSTRAINT pk_CalFinal PRIMARY KEY (Alumno_noControl, IdGrupo),
    CONSTRAINT fk_CF_Alumno FOREIGN KEY (Alumno_noControl) REFERENCES Alumno(NumeroControl) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_CF_Grupo FOREIGN KEY (IdGrupo) REFERENCES Grupo(IdGrupo) ON UPDATE CASCADE ON DELETE RESTRICT
) COMMENT = 'Calificación final del alumno en el grupo';

-- ============================================================
-- TABLA 15: BonusFinal
-- ============================================================
CREATE TABLE BonusFinal (
    NoControl_Alumno   VARCHAR(15)   NOT NULL COMMENT 'PK/FK → Alumno',
    IdGrupo            INT UNSIGNED  NOT NULL COMMENT 'PK/FK → Grupo',
    NumeroEmpleado     VARCHAR(15)   NOT NULL COMMENT 'FK → Maestro',
    Puntos_otorgados   DECIMAL(4,2)  NOT NULL,
    Justificacion      TEXT          NOT NULL,
    Fecha_asignacion   DATE          NOT NULL,
    Fecha_modificacion DATE,
    Estatus            ENUM('Activo','Aplicado') NOT NULL DEFAULT 'Activo',
    CONSTRAINT pk_BonusFinal  PRIMARY KEY (NoControl_Alumno, IdGrupo),
    CONSTRAINT fk_BF_CalFinal FOREIGN KEY (NoControl_Alumno, IdGrupo) REFERENCES Calificacion_Final(Alumno_noControl, IdGrupo)
		ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_BF_Maestro  FOREIGN KEY (NumeroEmpleado) REFERENCES Maestro(NumeroEmpleado)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_BF_puntos  CHECK (Puntos_otorgados >= 0 AND Puntos_otorgados <= 10)
) COMMENT = 'Puntos adicionales a nivel materia';

-- ============================================================
-- TABLA 16: ModificacionFinal
-- ============================================================
CREATE TABLE ModificacionFinal (
    NoControl_Alum     VARCHAR(15)   NOT NULL COMMENT 'PK/FK → Alumno',
    IdGrupo            INT UNSIGNED  NOT NULL COMMENT 'PK/FK → Grupo',
    NumeroEmpleado     VARCHAR(15)   NOT NULL COMMENT 'FK → Maestro',
    Calif_original     DECIMAL(5,2)  NOT NULL COMMENT 'Nota antes del ajuste manual',
    Calif_modificada   DECIMAL(5,2)  NOT NULL COMMENT 'Nueva nota definitiva',
    Justificacion      TEXT          NOT NULL,
    Fecha_modificacion DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Estatus            ENUM('Aplicado','Auditado') NOT NULL DEFAULT 'Aplicado',
    CONSTRAINT pk_ModFinal    PRIMARY KEY (NoControl_Alum, IdGrupo),
    CONSTRAINT fk_MF_CalFinal FOREIGN KEY (NoControl_Alum, IdGrupo) REFERENCES Calificacion_Final(Alumno_noControl, IdGrupo)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_MF_Maestro  FOREIGN KEY (NumeroEmpleado) REFERENCES Maestro(NumeroEmpleado)
        ON UPDATE CASCADE ON DELETE RESTRICT
) COMMENT = 'Ajuste manual del docente sobre la calificación final';

SET FOREIGN_KEY_CHECKS = 1;


-- CORRECCIÓN 1

ALTER TABLE Alumno
    RENAME COLUMN NumeroControl TO NoControl;
 
ALTER TABLE Inscripcion
    RENAME COLUMN NumeroControl TO NoControl;
 
ALTER TABLE Resultado_Actividad
    RENAME COLUMN Alumno_noControl      TO NoControl,
    RENAME COLUMN Actividad_idActividad TO IdActividad;
 
ALTER TABLE BonusUnidad
    RENAME COLUMN Alumno_noControl TO NoControl;
 
ALTER TABLE Calificacion_Unidad
    RENAME COLUMN Alumno_noControl TO NoControl;
 
ALTER TABLE Calificacion_Final
    RENAME COLUMN Alumno_noControl TO NoControl;
 
ALTER TABLE BonusFinal
    RENAME COLUMN NoControl_Alumno TO NoControl;
 
ALTER TABLE ModificacionFinal
    RENAME COLUMN NoControl_Alum TO NoControl;


-- CORRECIÓN 2
USE rca_sistema;

ALTER TABLE Carrera
    RENAME COLUMN IdCarrera       TO id_carrera,
    RENAME COLUMN NombreCarrera   TO nombre_carrera,
    RENAME COLUMN Siglas          TO siglas,
    RENAME COLUMN PlanEstudios    TO plan_estudios,
    RENAME COLUMN Modalidad       TO modalidad,
    RENAME COLUMN Total_semestres TO total_semestres,
    RENAME COLUMN Total_creditos  TO total_creditos;
 
ALTER TABLE Maestro
    RENAME COLUMN NumeroEmpleado      TO numero_empleado,
    RENAME COLUMN Nombre              TO nombre,
    RENAME COLUMN ApellidoPaterno     TO apellido_paterno,
    RENAME COLUMN ApellidoMaterno     TO apellido_materno,
    RENAME COLUMN CURP                TO curp,
    RENAME COLUMN RFC                 TO rfc,
    RENAME COLUMN FechaNacimiento     TO fecha_nacimiento,
    RENAME COLUMN Genero              TO genero,
    RENAME COLUMN CorreoInstitucional TO correo_institucional,
    RENAME COLUMN CorreoPersonal      TO correo_personal,
    RENAME COLUMN TelCelular          TO tel_celular,
    RENAME COLUMN TelOficina          TO tel_oficina,
    RENAME COLUMN Direccion           TO direccion,
    RENAME COLUMN TipoContrato        TO tipo_contrato,
    RENAME COLUMN Estatus             TO estatus,
    RENAME COLUMN FechaIngreso        TO fecha_ingreso,
    RENAME COLUMN GradoAcademico      TO grado_academico,
    RENAME COLUMN Especialidad        TO especialidad,
    RENAME COLUMN Departamento        TO departamento;
 
ALTER TABLE PeriodoEscolar
    DROP CONSTRAINT chk_Periodo_fechas;

ALTER TABLE PeriodoEscolar
    RENAME COLUMN IdPeriodo   TO id_periodo,
    RENAME COLUMN Descripcion TO descripcion,
    RENAME COLUMN Anio        TO anio,
    RENAME COLUMN FechaInicio TO fecha_inicio,
    RENAME COLUMN FechaFin    TO fecha_fin,
    RENAME COLUMN Estatus     TO estatus;

ALTER TABLE PeriodoEscolar
    ADD CONSTRAINT chk_periodo_fechas CHECK (fecha_fin > fecha_inicio);
 
ALTER TABLE Materia
    RENAME COLUMN ClaveMateria    TO clave_materia,
    RENAME COLUMN NombreMateria   TO nombre_materia,
    RENAME COLUMN Caracterizacion TO caracterizacion,
    RENAME COLUMN CreditosTotales TO creditos_totales,
    RENAME COLUMN HorasTeoricas   TO horas_teoricas,
    RENAME COLUMN HorasPracticas  TO horas_practicas,
    RENAME COLUMN No_unidades     TO no_unidades;

ALTER TABLE Reticula
    RENAME COLUMN ClaveMateria TO clave_materia,
    RENAME COLUMN IdCarrera    TO id_carrera,
    RENAME COLUMN Semestre     TO semestre,
    RENAME COLUMN Creditos     TO creditos;
 
ALTER TABLE Alumno
    RENAME COLUMN NoControl           TO matricula,
    RENAME COLUMN IdCarrera           TO id_carrera,
    RENAME COLUMN Nombre              TO nombre,
    RENAME COLUMN ApellidoPaterno     TO apellido_paterno,
    RENAME COLUMN ApellidoMaterno     TO apellido_materno,
    RENAME COLUMN CURP                TO curp,
    RENAME COLUMN FechaNacimiento     TO fecha_nacimiento,
    RENAME COLUMN Genero              TO genero,
    RENAME COLUMN CorreoInstitucional TO correo_institucional,
    RENAME COLUMN CorreoPersonal      TO correo_personal,
    RENAME COLUMN TelCelular          TO tel_celular,
    RENAME COLUMN TelCasa             TO tel_casa,
    RENAME COLUMN Direccion           TO direccion;
 
ALTER TABLE Grupo
    RENAME COLUMN IdGrupo        TO id_grupo,
    RENAME COLUMN ClaveMateria   TO clave_materia,
    RENAME COLUMN NumeroEmpleado TO numero_empleado,
    RENAME COLUMN IdPeriodo      TO id_periodo,
    RENAME COLUMN LimiteAlumnos  TO limite_alumnos,
    RENAME COLUMN Horario        TO horario,
    RENAME COLUMN Aula           TO aula,
    RENAME COLUMN Estatus        TO estatus;

ALTER TABLE Unidad
    RENAME COLUMN IdUnidad      TO id_unidad,
    RENAME COLUMN ClaveMateria  TO clave_materia,
    RENAME COLUMN Nombre_unidad TO nombre_unidad,
    RENAME COLUMN Temario       TO temario,
    RENAME COLUMN Estatus       TO estatus,
    RENAME COLUMN Fecha_cierre  TO fecha_cierre;
 
ALTER TABLE Actividad
    RENAME COLUMN IdActividad     TO id_actividad,
    RENAME COLUMN IdGrupo         TO id_grupo,
    RENAME COLUMN IdUnidad        TO id_unidad,
    RENAME COLUMN NombreActividad TO nombre_actividad,
    RENAME COLUMN Ponderacion     TO ponderacion,
    RENAME COLUMN Tipo_evaluacion TO tipo_evaluacion,
    RENAME COLUMN Estatus         TO estatus,
    RENAME COLUMN Fecha_entrega   TO fecha_entrega,
    RENAME COLUMN Bloqueado       TO bloqueado;
 
ALTER TABLE Inscripcion
    RENAME COLUMN NoControl         TO matricula,
    RENAME COLUMN IdGrupo           TO id_grupo,
    RENAME COLUMN Fecha_inscripcion TO fecha_inscripcion,
    RENAME COLUMN Estatus           TO estatus,
    RENAME COLUMN Tipo_curso        TO tipo_curso;
 
ALTER TABLE Resultado_Actividad
    RENAME COLUMN NoControl             TO matricula,
    RENAME COLUMN IdActividad           TO id_actividad,
    RENAME COLUMN Calificacion_obtenida TO calificacion_obtenida,
    RENAME COLUMN Calificacion_anterior TO calificacion_anterior,
    RENAME COLUMN Fecha_registro        TO fecha_registro,
    RENAME COLUMN Estatus               TO estatus,
    RENAME COLUMN NumeroEmpleado        TO numero_empleado;
 
ALTER TABLE BonusUnidad
    RENAME COLUMN NoControl          TO matricula,
    RENAME COLUMN IdUnidad           TO id_unidad,
    RENAME COLUMN IdGrupo            TO id_grupo,
    RENAME COLUMN NumeroEmpleado     TO numero_empleado,
    RENAME COLUMN Puntos_otorgados   TO puntos_otorgados,
    RENAME COLUMN Justificacion      TO justificacion,
    RENAME COLUMN Fecha_asignacion   TO fecha_asignacion,
    RENAME COLUMN Fecha_modificacion TO fecha_modificacion,
    RENAME COLUMN Estatus            TO estatus;
 
ALTER TABLE Calificacion_Unidad
    RENAME COLUMN NoControl                 TO matricula,
    RENAME COLUMN IdUnidad                  TO id_unidad,
    RENAME COLUMN IdGrupo                   TO id_grupo,
    RENAME COLUMN Promedio_ponderado        TO promedio_ponderado,
    RENAME COLUMN Calificacion_unidad_final TO calificacion_unidad_final,
    RENAME COLUMN Estatus_unidad            TO estatus_unidad;
 
ALTER TABLE Calificacion_Final
    RENAME COLUMN NoControl            TO matricula,
    RENAME COLUMN IdGrupo              TO id_grupo,
    RENAME COLUMN Promedio_unidades    TO promedio_unidades,
    RENAME COLUMN Calificacion_oficial TO calificacion_oficial,
    RENAME COLUMN Estatus_final        TO estatus_final;
 
ALTER TABLE BonusFinal
    RENAME COLUMN NoControl          TO matricula,
    RENAME COLUMN IdGrupo            TO id_grupo,
    RENAME COLUMN NumeroEmpleado     TO numero_empleado,
    RENAME COLUMN Puntos_otorgados   TO puntos_otorgados,
    RENAME COLUMN Justificacion      TO justificacion,
    RENAME COLUMN Fecha_asignacion   TO fecha_asignacion,
    RENAME COLUMN Fecha_modificacion TO fecha_modificacion,
    RENAME COLUMN Estatus            TO estatus;
 
ALTER TABLE ModificacionFinal
    RENAME COLUMN NoControl          TO matricula,
    RENAME COLUMN IdGrupo            TO id_grupo,
    RENAME COLUMN NumeroEmpleado     TO numero_empleado,
    RENAME COLUMN Calif_original     TO calif_original,
    RENAME COLUMN Calif_modificada   TO calif_modificada,
    RENAME COLUMN Justificacion      TO justificacion,
    RENAME COLUMN Fecha_modificacion TO fecha_modificacion,
    RENAME COLUMN Estatus            TO estatus;


RENAME TABLE PeriodoEscolar     TO periodo_escolar;
RENAME TABLE Resultado_Actividad TO resultado_actividad;
RENAME TABLE BonusUnidad        TO bonus_unidad;
RENAME TABLE Calificacion_Unidad TO calificacion_unidad;
RENAME TABLE Calificacion_Final  TO calificacion_final;
RENAME TABLE BonusFinal         TO bonus_final;
RENAME TABLE ModificacionFinal  TO modificacion_final;
 
SET FOREIGN_KEY_CHECKS = 1;
 
----------------------------- CORRECCIÓN 3 --------------------------------------

ALTER TABLE rca_sistema.alumno 
CHANGE COLUMN curp curp CHAR(18) NULL ,
CHANGE COLUMN fecha_nacimiento fecha_nacimiento DATE NULL ,
CHANGE COLUMN genero genero ENUM('M', 'F', 'Otro') NULL ;

ALTER TABLE rca_sistema.carrera 
CHANGE COLUMN siglas siglas VARCHAR(10) NULL COMMENT 'Abreviatura oficial (ej. ISC)' ,
CHANGE COLUMN plan_estudios plan_estudios VARCHAR(20) NULL COMMENT 'Clave SEP/TecNM del plan vigente' ,
CHANGE COLUMN modalidad modalidad ENUM('Presencial', 'A distancia', 'Mixta') NULL DEFAULT 'Presencial' ,
CHANGE COLUMN total_semestres total_semestres TINYINT UNSIGNED NULL COMMENT 'Número total de semestres del plan' ,
CHANGE COLUMN total_creditos total_creditos SMALLINT UNSIGNED NULL COMMENT 'Créditos totales requeridos' ;

------------------------- CORRECCIÓN 4 -------------

ALTER TABLE Alumno
    ADD COLUMN usuario VARCHAR(50) UNIQUE,
    ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT '';

ALTER TABLE Maestro
    ADD COLUMN usuario VARCHAR(50) UNIQUE,
    ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT '';

--- Correción 5 ---

ALTER TABLE `rca_sistema`.`maestro` 
CHANGE COLUMN `rfc` `rfc` VARCHAR(13) NULL ,
CHANGE COLUMN `fecha_nacimiento` `fecha_nacimiento` DATE NULL ,
CHANGE COLUMN `genero` `genero` ENUM('M', 'F', 'Otro') NULL ;

ALTER TABLE `rca_sistema`.`periodoescolar` 
RENAME TO  `rca_sistema`.`periodo_escolar` ;


ALTER TABLE Maestro 
ADD COLUMN usuario VARCHAR(50) UNIQUE,
ADD COLUMN password VARCHAR(255);


ALTER TABLE Alumno 
ADD COLUMN usuario VARCHAR(50) UNIQUE,
ADD COLUMN password VARCHAR(255);


----- O bien, puedes ejecutar este código con Foward Engineering: --
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
