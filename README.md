# PitchCoach

自身のビジネスコンテストでの経験をもとに、質疑応答練習を支援するAIアプリ「PitchMate」を開発。  
研究発表・面接対策・ピッチ練習の3つのモードを搭載し、入力内容に応じてAIが質問生成や評価を行う。

## 実装手順

1. ローカルへクローン

2. `api.env` を作成し、APIキーを設定

3. 以下のコマンドでDockerイメージをビルド

```bash
docker build -t pitchmate:local .
