<?php
    if (isset($_GET['filename'])) {
        $result = unlink(__DIR__ . '/upload/' . $_GET['filename']);
    }
    if (isset($result) && $result) {
        echo json_decode(array('status' => 'success'));
    } else {
        echo json_decode(array('status' => 'error'));
    }
