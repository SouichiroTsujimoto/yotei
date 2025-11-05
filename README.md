
### 環境変数の設定

プロジェクトルートに `.env.local` ファイルを作成し、以下の内容を追加してください：

```bash
# バックエンドAPIのベースURL
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3000
```

本番環境では、適切なAPIのURLに変更してください。

### 開発サーバーの起動

```bash
yarn run dev
```
