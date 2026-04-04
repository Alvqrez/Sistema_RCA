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