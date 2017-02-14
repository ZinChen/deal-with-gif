<?php
if (isset($_POST["url"])) {

    $upload_url = $_POST["url"];

    $uploadfile = __DIR__ . '/upload/' . basename($_FILES['photo']['name']);

    if (move_uploaded_file($_FILES['photo']['tmp_name'], $uploadfile)) {
        $post_params['file'] = '@' . 'upload/' . basename($_FILES['photo']['name']);

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $upload_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $post_params);
        $result = curl_exec($ch);
        curl_close($ch);

        unlink($uploadfile);
        echo $result;
    }
}