## 準備

1. 前回資料を参照し、Cloud9の起動する
2. Cloud9にログイン後、serverless framworkをダウンロードする
    `npm install -g serverless`
3. `git`でこのリポジトリをクローンする
    `git clone https://github.com/maskinoshita/face_replacer_example.git`
4. `git`でブランチを全て取得しておきましょう
    `git pull --all`

## ハンズオン手順

```bash
#ソースコード
#https://github.com/maskinoshita/face_replacer_example

# 手順
# Cloud9 起動
npm -g install severless
git clone https://github.com/maskinoshita/face_replacer_example.git

cd face_replacer_example

# git pull --all
# リモートリポジトリを取得	
git checkout -b p1 origin/p1
git checkout -b p2 origin/p2
git checkout -b p3 origin/p3
git checkout -b p4 origin/p4

# 最初のコードに戻る
git checkout main

# 要修正
# !!! serverless.yml 内の custom.suffix を変更する

# 最初のデプロイ
sls deploy

# CFnスタックの出力値を表示する
sls info --verbose

# 表示される値をメモる
export ProcessedBucketName=face-replacer-XXXXX-dev

# staticフォルダの中身をs3のバケットへコピーする
# (index.htmlをコピー)
aws s3 sync static s3://$ProcessedBucketName

# `sls info --verbose`で表示されるStaticWebSiteUrlにブラウザでアクセスすると
# 先程アップロードしたindex.htmlにアクセスできる

# face_replacer作成済みのコードをMerge
git merge p1

# ライブラリのインストール
# package.jsonに記述されているライブラリがnode_modulesに追加される
npm install 

# p1変更済みのコードをデプロイ
sls deploy

# ログを表示させつつ、S3のOriginalBucketに顔画像をコピーしてみる
# サンプル顔画像 https://drive.google.com/file/d/1DJN-FoZyHpAUTMjWPFRlvnRtr3yPDAVp/view?usp=sharing

# エラーが出たら、修正
sls logs -f face_replacer --tail

# 単体テスト、作成済みのコードをMerge
git merge p2

# face_replacer_util.jsを確認
# face_replacer_util.test.js が単体テスト

# 単体テストの実施
# face_replacer_util.jsのコードを書き換えるなどして試してみてください
npm test

# 作成済みのコード
git stash # mergeできなかったら一旦退避
git merge p4
git stash pop # 退避したファイルを復帰

# static/index.htmlのAPIのURLをAPI GatewayのURLに変更する
# 変更済みのコードをS3に再アップロード
aws s3 sync static s3://$ProcessedBucketName

# StateicWebSiteのURLにアクセスする
# 適当な顔画像をOriginBucketにアップロードして加工済み画像が生成されたあと、StaticWebSiteにアクセスし確認する

# X-Rayのコンソールから、トレース情報を確認する

# cleanup
# s3をAWSコンソールで空にする `face_replacer_XX` `XXX_original_bucket`
sls remove
```

