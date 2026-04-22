# Configuration

LinkBoard can be configured using environment variables.

| Environment Variable | Description | Default |
| --- | --- | --- |
| `PORT` | The port the application will listen on. | `3000` |
| `SESSION_SECRET` | A secret string used to sign session cookies. | `dolt-secret-gold-navy` |
| `DB_PATH` | Path where the SQLite database will be stored. | `./bookmarks.sqlite` |
| `NODE_ENV` | Running mode (`development` or `production`). | `production` |

## Example `.env` File
```env
PORT=8080
SESSION_SECRET=a-very-secure-random-string
DB_PATH=/var/lib/linkboard/data.sqlite
```
