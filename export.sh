echo 'CREATE TABLE IF NOT EXISTS bots (
    username TEXT NOT NULL PRIMARY KEY,
    name TEXT,
    description TEXT
);\n' > bots.sql

jq -r 'unique_by(.username) | .[] | "INSERT INTO bots (name, username, description) VALUES (\"\(.name // "")\", \"\(.username // "")\", \"\(.description // "" | gsub("\"";"\"\""))\");"' bots.json >> bots.sql