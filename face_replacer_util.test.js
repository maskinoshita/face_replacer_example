// mocking 
// AWS mocked
jest.mock("aws-sdk", () => ({
    // AWS.Rekognition() mocked
    Rekognition: jest.fn().mockImplementation(() => ({
        // detectFaces() mocked
        detectFaces: jest.fn().mockImplementation((params) => {
            // json load hack
            const detect_face_sample = require("./test_resources/detectFacesSample.json");
            return ({
                // promise() mocked
                promise: jest.fn().mockResolvedValue(detect_face_sample)
            });
        })
    })),
    S3: jest.fn(),
    DynamoDB: jest.fn()
}));
// インスタンスの特定のメソッドをMockする場合
// jest.spyOn(s3Client, 'getSignedUrlPromise').mockImplementation(async () => 'returnValue');

const {
    detectFaces,
    downloadOriginalImage,
    replaceFaces,
    uploadProcessedImage
 } = require('./face_replacer_util.js');


describe('detectFaces', () => {
   // テストケースごとにMockをリセットする
   beforeEach(() => {
       jest.clearAllMocks();
   });
   // 正常系のケース(1人) : 注意! 本当はいろんなケースが必要 (0, N人)
   test('正しくRekognition.detectFacesのサマリーを返却する', async () => {
       const expected = [
           {
               "BoundingBox": {
                   "Height": 0.6968063116073608,
                   "Left": 0.26937249302864075,
                   "Top": 0.11424895375967026,
                   "Width": 0.42325547337532043
               },
               "Pose": {
                   "Pitch": -4.970901966094971,
                   "Roll": -1.4911699295043945,
                   "Yaw": -10.983647346496582
               },
               "Gender": "Male", 
               "Emotion": "CALM", 
           }
       ];
       let dummyS3Input = {};
       const actual = await detectFaces(dummyS3Input);
       expect(actual).toStrictEqual(expected);
   });
   // 例外のケース
   test('パラメータを空で呼び出したら、TypeErrorがスローされる', async () => {
       await expect(detectFaces()).rejects.toThrow(TypeError);
   });
});


describe('replaceFaces', () => {
    test('faceInfoに従って適切な顔の置き換えが行われる', async () => {
        const sharp = require('sharp');
        const fs = require('fs');
        const sourceFilename = "./test_resources/sampleFace_origin.jpg";
        const processedFilename = "./test_resources/sampleFace_processed.jpg";
        const faceInfos = require("./test_resources/sampleFaceInfos.json");

        const expected = await sharp(processedFilename).toBuffer();
        const buffer = await replaceFaces(sourceFilename, faceInfos);
        const actual = await sharp(buffer).toBuffer();
        expect(expected.equals(actual)).toBeTruthy();
    });
});