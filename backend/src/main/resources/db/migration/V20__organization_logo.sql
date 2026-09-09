ALTER TABLE company_settings
    ADD COLUMN logo_data MEDIUMBLOB NULL,
    ADD COLUMN logo_content_type VARCHAR(40) NULL;
