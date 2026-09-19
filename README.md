# YGファイヤーズアプリ

草野球チーム　YGファイヤーズ　のWebアプリ

## 使用技術

- Node.js >= 22.13.0
- Vite 8
- vinext
- React / Next.js系構成
- Cloudflare Workers
- Cloudflare D1
- Wrangler
- Drizzle

本番Worker:

```text
site-creator-vinext-starter
```

本番URL:

```text
https://site-creator-vinext-starter.hokuieren1212.workers.dev
```

D1 Database:

```text
yg_member_db
```

D1 Binding:

```text
DB
```

---

# 1. 初回セットアップ

リポジトリを取得する。

```bash
git clone <repository-url>
cd site-creator-vinext-starter
```

依存パッケージをインストール。

```bash
npm install
```

Node.jsのバージョンを確認。

```bash
node -v
```

目安:

```text
v22.13.0 以上
```

---

# 2. Cloudflareへログイン

初回のみ実行。

```bash
npx wrangler login
```

ブラウザが開くのでCloudflareへのアクセスを許可する。

ログイン確認:

```bash
npx wrangler whoami
```

---

# 3. D1 Database

## 新しくDBを作る場合

```bash
npx wrangler d1 create yg_member_db
```

作成すると以下のような情報が表示される。

```text
database_name = "yg_member_db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

既存環境で使用していたDB ID:

```text
673361f5-0bdc-4968-aea1-21970ca8b010
```

Cloudflare側では、アプリから

```text
DB
```

という名前でアクセスする。

設定イメージ:

```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "yg_member_db",
      "database_id": "673361f5-0bdc-4968-aea1-21970ca8b010"
    }
  ]
}
```

---

# 4. DBマイグレーション

Drizzleのマイグレーションファイル:

```text
drizzle/0000_military_bloodstrike.sql
```

現在使用している主なテーブル:

```text
auth_config
login_attempts
sessions
team_state
```

## マイグレーションSQLを生成

DB定義を変更した場合:

```bash
npm run db:generate
```

---

# 5. ローカルDBを作る

本番D1とは別に、ローカル用D1を作成する。

```bash
npx wrangler d1 execute yg_member_db \
  --local \
  --file="./drizzle/0000_military_bloodstrike.sql"
```

Windows PowerShellなら1行でもOK。

```powershell
npx wrangler d1 execute yg_member_db --local --file="./drizzle/0000_military_bloodstrike.sql"
```

テーブル確認:

```bash
npx wrangler d1 execute yg_member_db \
  --local \
  --command="SELECT name FROM sqlite_master WHERE type='table';"
```

`auth_config`、`sessions`、`team_state` などが表示されればOK。

---

# 6. ローカル用Secret

認証処理で以下のSecretを使用する。

```text
TEAM_BOOTSTRAP_PASSWORD
AUTH_PEPPER
```

ローカルでは `.dev.vars` を作成する。

```text
TEAM_BOOTSTRAP_PASSWORD="任意のパスワード"
AUTH_PEPPER="ランダムな文字列"
```

AUTH_PEPPERは例えばNode.jsで生成できる。

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`.dev.vars` はGitにコミットしない。

`.gitignore`:

```gitignore
.dev.vars
.dev.vars.*
.env
.env.*
```

---

# 7. ローカル起動

通常の開発時:

```bash
npm run dev
```

コードを修正しながら確認するときはこちらを使う。

---

## 本番に近い状態で確認する場合

まずビルド。

```bash
npm run build
```

続いて:

```bash
npm run start
```

この場合、生成された

```text
dist/server/wrangler.json
```

を使ってCloudflare Workers環境に近い状態で起動する。

基本的には、

```text
普段の開発
↓
npm run dev

本番直前の確認
↓
npm run build
npm run start
```

でOK。

---

# 8. 本番DBを初期化

⚠️ `--remote` はCloudflare上の本番DBを変更する。

初回デプロイ時など、本番D1にテーブルがない場合:

```bash
npx wrangler d1 execute yg_member_db \
  --remote \
  --file="./drizzle/0000_military_bloodstrike.sql"
```

Windows PowerShell:

```powershell
npx wrangler d1 execute yg_member_db --remote --file="./drizzle/0000_military_bloodstrike.sql"
```

本番DBのテーブル確認:

```bash
npx wrangler d1 execute yg_member_db \
  --remote \
  --command="SELECT name FROM sqlite_master WHERE type='table';"
```

---

# 9. 本番Secretを登録

TEAM_BOOTSTRAP_PASSWORD:

```bash
npx wrangler secret put TEAM_BOOTSTRAP_PASSWORD --name site-creator-vinext-starter
```

入力を求められるのでパスワードを入力する。

AUTH_PEPPER:

```bash
npx wrangler secret put AUTH_PEPPER --name site-creator-vinext-starter
```

AUTH_PEPPERを生成する場合:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

生成された値をCloudflare Secretとして登録する。

Secretの値そのものはGitHub等に保存しない。

---

# 10. Cloudflareへデプロイ

まずビルド。

```bash
npm run build
```

成功すると、

```text
dist/server/wrangler.json
```

などが生成される。

その後Cloudflare Workersへデプロイ。

```bash
npx wrangler deploy --config dist/server/wrangler.json
```

デプロイ先:

```text
https://site-creator-vinext-starter.hokuieren1212.workers.dev
```

---

# 11. デプロイ確認

ブラウザで本番URLへアクセスする。

```text
https://site-creator-vinext-starter.hokuieren1212.workers.dev
```

認証API確認:

```text
/api/auth
```

Workerのログをリアルタイムで見る場合:

```bash
npx wrangler tail site-creator-vinext-starter
```

ブラウザからアクセスするとログが表示される。

本番環境で500エラー等が発生した場合は、まずこれを見る。

---

# 12. よく使うコマンド

開発:

```bash
npm run dev
```

ビルド:

```bash
npm run build
```

Cloudflare環境でローカル確認:

```bash
npm run start
```

DB定義からmigration生成:

```bash
npm run db:generate
```

本番デプロイ:

```bash
npm run build
npx wrangler deploy --config dist/server/wrangler.json
```

ローカルDB確認:

```bash
npx wrangler d1 execute yg_member_db --local --command="SELECT name FROM sqlite_master WHERE type='table';"
```

本番DB確認:

```bash
npx wrangler d1 execute yg_member_db --remote --command="SELECT name FROM sqlite_master WHERE type='table';"
```

本番ログ:

```bash
npx wrangler tail site-creator-vinext-starter
```

---

# 13. 新しいPCで開発を始める場合

基本的には以下の順番。

```bash
git clone <repository-url>

cd site-creator-vinext-starter

npm install
```

Cloudflareログイン:

```bash
npx wrangler login
```

`.dev.vars` を作る。

```text
TEAM_BOOTSTRAP_PASSWORD="..."
AUTH_PEPPER="..."
```

ローカルDB初期化:

```bash
npx wrangler d1 execute yg_member_db --local --file="./drizzle/0000_military_bloodstrike.sql"
```

起動:

```bash
npm run dev
```

これでローカル開発を開始できる。

---

# 14. 本番へ変更を反映する場合

通常はこの流れ。

```text
コード修正
   ↓
npm run dev
   ↓
ローカル確認
   ↓
npm run build
   ↓
npm run start
   ↓
本番相当確認
   ↓
npx wrangler deploy --config dist/server/wrangler.json
```

DB変更がある場合だけ、本番DBにもSQLを適用する。

```bash
npx wrangler d1 execute yg_member_db --remote --file="./drizzle/XXXX_migration.sql"
```

⚠️ DB変更を伴わない通常のコード修正では、D1のSQL実行は不要。