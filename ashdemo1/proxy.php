<?php
    if (!isset($_REQUEST['uri'])) {
        die("No URI Specified!");
    }
    $uri = $_REQUEST['uri'];
    if (empty($uri)) {
        die("No URI Specified!");
    }

    $custom_headers = [];

    $req = curl_init($uri);

    if (isset($_SERVER['HTTP_ACCEPT'])) {
        $custom_headers[] = "Accept: " . $_SERVER['HTTP_ACCEPT'];
    } else {
        die('Cannot process the Accept headers!');
    }

    if (isset($_SERVER['HTTP_USER_AGENT'])) {
        $custom_headers[] = "User-Agent: " . $_SERVER['HTTP_USER_AGENT'];
    }

    curl_setopt($req, CURLOPT_HTTPHEADER, $custom_headers);
    curl_setopt($req, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($req, CURLOPT_VERBOSE, 1);
    curl_setopt($req, CURLOPT_HEADER, 1);

    $resp = curl_exec($req);
    $header_size = curl_getinfo($req, CURLINFO_HEADER_SIZE);
    $header = substr($resp, 0, $header_size);
    $headers = explode("\n",$header);
    $body = substr($resp, $header_size);

    foreach ($headers as $h) {
        header($h);
    }
    echo $body;