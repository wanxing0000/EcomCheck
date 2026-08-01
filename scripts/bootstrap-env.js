import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

process.env.DOTENV_CONFIG_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', '.env')
