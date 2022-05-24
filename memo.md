# 手順

## 0. 準備

### 初めからやる場合

1. `sls create --template aws-nodejs --path face_replacer`
2. `move handler.js > face_replacer.js`
3. `cp face_replacer.js query.js`
4. `face_replacer.js`と`query.js`の内の関数名を`hello`からそれぞれ`face_replacer`と`query`に変更する
5. このリポジトリの`serverless.yml`をコピーする

### リポジトリのクローンからやる場合

1. `git clone https://github.com/maskinoshita/face_replacer_example.git`
2. `npm install`

### staticディレクトリ内のファイルをアップロード (static内のファイルを編集した適宜実行)

1. `sls deploy`
2. `sls info --verbose`で`ProcessedBucketName`を確認
3. `export ProcessedBucketName="[ProcessedBucketNameの値]"`を実行
4. `aws s3 sync static s3://${ProcessedBucketName}`を実行

### S3バケット内のクリア (S3バケット自体の削除に必要)

1. `sls info --verbose`で`OriginalBucketName`と`ProcessedBucketName`を確認
2. `export ProcessedBucketName="[ProcessedBucketNameの値]"`を実行
3. `export OriginalBucketName="[OriginalBucketNameの値]"`を実行
4. `aws s3 rm s3://${ProcessedBucketName} --recursive`
5. `aws s3 rm s3://${OriginalBucketName} --recursive`

