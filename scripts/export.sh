#!/bin/bash

# Create the SQL file with the proper schema matching our API
echo 'DROP TABLE IF EXISTS bots;

CREATE TABLE IF NOT EXISTS bots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  username TEXT NOT NULL,
  description TEXT,
  category_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);' > bots.sql

# Convert JSON data to SQL INSERT statements
# Filter out entries where username is null and clean up the username field
jq -r '
  unique_by(.username) | 
  map(select(.username != null and .username != "")) |
  .[] | 
  "INSERT INTO bots (name, username, description, category_id) VALUES (" +
  "\"" + (.name // "" | gsub("\"";"\"\"")) + "\", " +
  "\"" + (.username | gsub("@";"") | gsub("\"";"\"\"")) + "\", " +
  "\"" + (.description // "" | gsub("\"";"\"\"")) + "\", " +
  (if .category_id == null then "NULL" else (.category_id | tostring) end) +
  ");"
' bots.json >> bots.sql

echo "Generated bots.sql with $(grep -c "INSERT INTO" bots.sql) bot entries"