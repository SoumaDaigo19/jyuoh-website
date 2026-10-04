# JUOH LINE Attribution Tracker

獣王就活の **SNS → LINE友だち追加** を、低ボリューム運用向けに時刻相関で推定する小さな計測サービスです。

## 仕組み

1. SNSプロフィールにはLINE直リンクではなく、このサイトの中継リンクを置く。
   - Instagram: `/l/ig`
   - TikTok: `/l/tt`
   - X: `/l/x`
2. 中継リンクのクリック時刻・媒体を保存し、既存のLINE友だち追加URLへ302リダイレクト。
3. LINE Messaging APIの `follow` Webhookから友だち追加時刻を保存。
4. 直前30分のクリックとfollowを照合して媒体を推定。
5. `/api/attribution-daily?date=YYYY-MM-DD` で日次匿名集計を返す。

LINE userId、氏名、メール等は保存しません。

## 推定ルール

- HIGH: follow前10分以内に1媒体からしかクリックがない
- MEDIUM: follow前30分以内に1媒体からしかクリックがない
- LOW: 30分以内に複数媒体のクリックがあり、最も近い媒体を暫定採用
- UNKNOWN: 30分以内にクリックがない

厳密な個人単位アトリビューションではなく、現在の獣王就活の低ボリュームを前提とした実用的推定です。

## Netlify

**既存の `juoshukatu.netlify.app` 無料相談予約サイトには上書きしないこと。**
このリポジトリは別の新規Netlify Siteとしてデプロイする。

1. Netlifyで `SoumaDaigo19/jyuoh-website` を新規SiteとしてImport
2. Environment variablesに `LINE_CHANNEL_SECRET`
3. Deploy
4. LINE Developers ConsoleのWebhook URLを `https://<新サイト>/line/webhook`
5. Webhookを有効化してVerify
6. プロフィールリンクを以下に変更
   - `https://<新サイト>/l/ig`
   - `https://<新サイト>/l/tt`
   - `https://<新サイト>/l/x`

既に友だちの場合、ブロック→解除でWebhook受信を試せる。ブロック解除は新規友だち数には含めない。

## 将来拡張

中継URLは `content_id` / `campaign` / `cta` を受け取れる。
例: `/l/ig?content_id=IG-123&cta=interview100`
