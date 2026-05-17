<?php
error_reporting(0);
ini_set('display_errors', 0);
header('Content-Type: application/json');

// .envを読み込む
$env = parse_ini_file(__DIR__ . '/api.env');
$api_key = $env['ANTHROPIC_API_KEY'] ?? getenv('ANTHROPIC_API_KEY');

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'];

if ($action === 'generate_questions') {
    $pitch = $input['pitch'];
    $difficulty = $input['difficulty'];
    $mode = $input['mode'] ?? 'pitch';

    $difficultyText = [
        'やさしい' => '初心者に優しく、基本的な',
        '普通' => '一般的なレベルの',
        '厳しい' => '非常に鋭く厳格な'
    ][$difficulty] ?? '一般的な';

    if ($mode === 'pitch') {
        $content = "以下のピッチ内容に対して、VCやビジネスコンテスト審査員として{$difficultyText}質問を3つ生成してください。質問のみを番号付きで出力してください。\n\n" . $pitch;

    } else if ($mode === 'interview') {
        $industry = $input['industry'] ?? '';
        $content = "志望業界・業種：{$industry}\n\n応募者の情報：\n{$pitch}\n\n上記を踏まえて、採用担当者として{$difficultyText}面接質問を3つ生成してください。志望動機・自己PR・ガクチカ・業界知識を問う質問にしてください。質問のみを番号付きで出力してください。";

    } else if ($mode === 'presentation') {
        $content = "以下の発表内容に対して、教授や指導者として{$difficultyText}質問を3つ生成してください。内容の理解度・論理性・根拠を問う質問にしてください。質問のみを番号付きで出力してください。\n\n" . $pitch;
    }

    $messages = [["role" => "user", "content" => $content]];

}else if ($action === 'get_feedback') {
    $question = $input['question'];
    $answer = $input['answer'];

    $messages = [
        [
            "role" => "user",
            "content" => "審査員の質問：{$question}\n\n回答者の答え：{$answer}\n\nこの回答に対して、明確さ・論理性・説得力の観点でフィードバックしてください。\n\n良かった点、改善点、一言アドバイスをください。\n\n最後に【評価】5段階評価で数字のみ（1〜5）の形で出力してください。"
        ]
    ];

} else if ($action === 'get_summary') {
    $pitch = $input['pitch'];
    $qa = $input['qa'];

    $qaText = "";
    foreach ($qa as $item) {
        $qaText .= "質問：{$item['question']}\n回答：{$item['answer']}\n\n";
    }

    $messages = [
        [
            "role" => "user",
            "content" => "発表内容：{$pitch}\n\n{$qaText}\n\n上記の質疑応答全体を踏まえて、以下の形式で総合評価をしてください。\n\n【総合スコア】100点満点で点数\n【良かった点】\n【改善すべき点】\n【次回への一言アドバイス】"
        ]
    ];

} else if ($action === 'get_followup') {
    $pitch = $input['pitch'];
    $qa = $input['qa'];
    $difficulty = $input['difficulty'];

    $qaText = "";
    foreach ($qa as $item) {
        $qaText .= "質問：{$item['question']}\n回答：{$item['answer']}\n\n";
    }

    $difficultyText = [
        'やさしい' => '初心者に優しく、基本的な',
        '普通' => '一般的なレベルの',
        '厳しい' => '非常に鋭く厳格な'
    ][$difficulty] ?? '一般的な';
    $messages = [
            [
                "role" => "user",
                "content" => "発表内容：{$pitch}\n\n以下の質疑応答を踏まえて、{$difficultyText}追加質問を2つ生成してください。前の回答への深掘りや新たな観点からの質問にしてください。質問のみを番号付きで出力してください。\n\n{$qaText}"
            ]
        ];
}

$data = [
    "model" => "claude-sonnet-4-20250514",
    "max_tokens" => 1024,
    "messages" => $messages
];

$ch = curl_init("https://api.anthropic.com/v1/messages");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "x-api-key: " . $api_key,
    "anthropic-version: 2023-06-01"
]);

$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);
if (isset($result['content'][0]['text'])) {
    echo json_encode(['text' => $result['content'][0]['text']]);
} else {
    echo json_encode(['text' => 'error', 'debug' => $result]);
}