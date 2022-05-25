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

## 1. face_replacerの開発 (単体テストの実施)

### 開発

1. 4つの関数を作る
    * `detectFaces`: 入力の顔画像のS3のオブジェクトを受け取ってRekognition DetectFaces APIを呼び出し、JSON形式で人数分下記の属性を返却する
        - 属性
            - 顔の範囲 (BoundingBox) [0.0~1.0]
                - Left
                - Top
                - Width
                - Height
            - 顔の回転 (Pose) [rad]
                - Pitch
                - Roll
                - Yaw
            - 性別 (Gender)
                - Male
                - Female
            - 感情 (Emotion/下記のうちConfidenceがもっと大きいもの)
                - DISGUSTED
                - HAPPY
                - SURPRISED
                - ANGRY
                - CONFUSED
                - CALM
                - SAD
        - ex)
            ```json
            [
                {
                    "BoundingBox": { "Left": 0.01, "Top": 0.2, "Height": 0.01, "Width": 0.01 },
                    "Gender": "Male",
                    "Emotion": "HAPPY"
                },
                ...
            ]
            ```
    * `downloadOriginalImage`: 元画像をS3からローカルのテンポラリディレクトリにファイルをダウンロードし、ファイル名を返却する
        - "/tmp/xxxx.jpg"
    * `replaceFaces`: `detect_face`の返却値を利用と入力の顔画像のファイル名を受け取って、顔を入れ替えた画像を作成し、Bufferを返す
        - "/tmp/xxxx.jpg"
    * `uploadProcessedImage`: 入れ替えた画像Bufferを受け取り、出力バケットにアップロードする。また、アップロードしたオブジェクト名とアップロード時刻をDynamoDBに書き込む
        - `env.processed_bucket`で出力バケットを参照できる
2. ライブラリをインストールする
    * `npm install --save aws-sdk`
    * `npm install --save sharp`
    * `npm install --save uuid`

### 単体テスト

1. テストフレームワークJestの導入
    `npm install --save-dev jest`
1. 4つの関数をテスタブルにする
    - 関数がエクスポートされていないと外部のファイルから利用できない
    - ついでにface_replacer.jsが長くなってしまっているので、外部ファイルに切り出す。
        - `face_replacer_util.js`に切り出す
            - `module.exports`
            - `process.env`はライブラリ内では使わないように変更
        - `face_replacer.js`で`face_replacer_util.js`をロードする
1. テストコード`face_replacer_util.test.js`を作成する
1. `package.json`にテスト実行のスクリプトを追加する
    ```
        ...,
        "scripts": {
            "test": "jest"
        }
    }
    ```    

1. テストイベントの保存先を作成 `mkdir -p events`
2. テストイベントの作成 `sls generate-event -t aws:s3 | jq . > events/s3_add_original_image.json`

## Misc

* 顔画像集は、素材ラボから取得しました。
    - https://www.sozailab.jp/
* 顔画像
    - https://generated.photos/