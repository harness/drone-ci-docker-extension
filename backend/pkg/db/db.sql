DROP TABLE IF EXISTS pipelines; 
CREATE TABLE pipelines (
        id VARCHAR(32) NOT NULL,
        pipeline_path TEXT NOT NULL,
        pipeline_file TEXT NOT NULL,
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY(id ASC)
);

DROP TABLE IF EXISTS stages; 
CREATE TABLE stages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        pipeline_id VARCHAR(32) NOT NULL,
		status INTEGER NOT NULL,
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		CONSTRAINT fk_pipeline
			FOREIGN KEY (pipeline_id)
			REFERENCES pipelines(id)
			ON DELETE CASCADE
);

DROP TABLE IF EXISTS stage_steps; 
CREATE TABLE stage_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        image VARCHAR(255) NOT NULL,
        status INTEGER NOT NULL,
		stage_id INTEGER NOT NULL,
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		CONSTRAINT fk_pipeline
			FOREIGN KEY (stage_id)
			REFERENCES stages(id)
			ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_unique_pipeline ON pipelines (pipeline_file);
CREATE UNIQUE INDEX idx_unique_stage_name ON stages (name, pipeline_id);
CREATE UNIQUE INDEX idx_unique_step_name ON stage_steps (name, stage_id);
