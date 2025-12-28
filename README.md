## Optime
![Create Next App · 12 46am · 12-29](https://github.com/user-attachments/assets/568ed7d4-6cfa-4689-93a2-0cb8febd6754)
![Create Next App · 12 47am · 12-29](https://github.com/user-attachments/assets/8357f2f1-310e-41ed-abba-2ac409e45676)

https://optime-schedule.com/

RSSを用いた投票結果の通知機能や、settings.jsonによる投票設定などの機能を持つ、調整さんライクな予定投票サイトです。

### Optime-backend
https://github.com/SouichiroTsujimoto/Optime-backend


## Dev

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
