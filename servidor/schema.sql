-- ============================================================
-- schema.sql — Anonymous Chatbot
-- Execute este arquivo inteiro em um banco MySQL/MariaDB vazio.
-- ============================================================

CREATE DATABASE IF NOT EXISTS chat_bot_anonymous
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE chat_bot_anonymous;

-- ------------------------------------------------------------
-- usuarios
-- Nenhuma coluna guarda o código em texto puro. `lookup_hash` é
-- um HMAC determinístico (serve só para localizar a linha),
-- `code_hash` é o bcrypt (serve para validar o login).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  lookup_hash    CHAR(64)     NOT NULL COMMENT 'HMAC-SHA256 do código, em hex',
  code_hash      VARCHAR(60)  NOT NULL COMMENT 'bcrypt do código',
  code_last_two  CHAR(2)      NOT NULL COMMENT 'só para exibir "******XX" ao usuário',
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at  DATETIME     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_lookup_hash (lookup_hash)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- login_attempts
-- Controle de força bruta POR IP (ver comentário em
-- services/autenticacao.js sobre por que não dá para bloquear
-- por conta). Uma linha por IP que já errou pelo menos uma vez.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS login_attempts (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ip_hash       CHAR(64)     NOT NULL COMMENT 'HMAC-SHA256 do IP, em hex',
  failed_count  INT UNSIGNED NOT NULL DEFAULT 0,
  lock_until    DATETIME     NULL,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_login_attempts_ip_hash (ip_hash)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- conversation
-- text_input/text_output NUNCA guardam texto puro — vão
-- criptografados (AES-256-GCM) pelo services/conversation.js.
-- ON DELETE CASCADE: se a conta for apagada, as conversas somem
-- junto (nada de dado órfão vinculado a uma conta que não existe
-- mais — importante para um produto que promete privacidade).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversation (
  id_conversation    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name_conversation  VARCHAR(255) NOT NULL,
  text_input         TEXT         NOT NULL COMMENT 'criptografado, formato iv.tag.dados em base64',
  text_output        TEXT         NOT NULL COMMENT 'criptografado, formato iv.tag.dados em base64',
  FK_id_user         INT UNSIGNED NOT NULL,
  create_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_conversation),
  KEY idx_conversation_user (FK_id_user),
  CONSTRAINT fk_conversation_usuario
    FOREIGN KEY (FK_id_user) REFERENCES usuarios (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;
