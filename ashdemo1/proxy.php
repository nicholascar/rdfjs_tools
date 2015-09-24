<?php
    const cache_map = array(
        "http://www.w3.org/1999/02/22-rdf-syntax-ns" => "rdf.ttl",
        "http://www.w3.org/2000/01/rdf-schema" => "rdfs.ttl",
        "http://www.w3.org/2002/07/owl" => "owl.ttl",
        "http://lov.okfn.org/vocommons/voaf/v2.3/"=>"voaf.ttl",
        "http://purl.org/vocommons/voaf"=>"voaf.ttl",
        "http://vocab.deri.ie/void" => "void.ttl",
        "http://rdfs.org/ns/void" => "void.ttl",
        "http://purl.org/vocab/frbr/core" => "frbr.core.ttl",
        "http://www.w3.org/ns/adms" => "adms.ttl",
        "http://www.w3.org/ns/dcat" => "dcat.ttl",
        "http://purl.org/dc/dcmitype/" => "dcmi.ttl",
        "http://purl.org/dc/terms/" => "dcterms.ttl",
        "http://purl.org/dc/elements/1.1/" => "dcelements.ttl",
        "http://xmlns.com/foaf/0.1/" => "foaf.ttl",
        "http://www.w3.org/2004/02/skos/core" => "skos.ttl",
        "http://scikey.org/def/vocab" => "vocab.ttl",
    );
    const sample_map = array(
     "example1" => "example1.ttl",
    );


    function startswith($haystack, $needle) {
        return substr($haystack, 0, strlen($needle)) === $needle;
    }
    function return_cached($cachename, $dir="cache") {
        http_response_code(200);
        header("Content-Type: text/turtle");
        header("Access-Control-Allow-Origin: *");
        $filename = dirname(__FILE__)."/".$dir."/".$cachename;
        if(!readfile($filename)){
            die("Could not read the file ".$filename);
        }
        exit();
    }
    function check_cache($uri){
        foreach (cache_map as $mapkey => $mapvalue) {
            if (startswith($uri, $mapkey)) {
                return_cached($mapvalue);
            }
        }

    }
    function check_samples($uri) {
        if (startswith($uri,"http://example.org/")) {
            $filename = substr($uri,19);
        } else {
            return false;
        }
        foreach (sample_map as $mapkey => $mapvalue) {
            if (startswith($filename, $mapkey)) {
                return_cached($mapvalue, "samples");
            }
        }
    }


    if (!isset($_REQUEST['uri'])) {
        die("No URI Specified!");
    }
    $uri = $_REQUEST['uri'];
    if (empty($uri)) {
        die("No URI Specified!");
    }
    check_samples($uri);
    check_cache($uri);

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
    curl_setopt($req, CURLOPT_FOLLOWLOCATION, true);

    $resp = curl_exec($req);
    $header_size = curl_getinfo($req, CURLINFO_HEADER_SIZE);
    $header = substr($resp, 0, $header_size);
    $headers = explode("\n",$header);
    $body = substr($resp, $header_size);

    $httpcode = curl_getinfo($req, CURLINFO_HTTP_CODE);
    if ($httpcode != 200) {
        die("Code = " . $httpcode);
    }
    foreach ($headers as $h) {
        if (startswith($h, "Set-Cookie") ||
            startswith($h, "Transfer-Encoding") ||
            startswith($h, "Access-Control")
            ) {continue;}
        header($h);
    }
    header("Access-Control-Allow-Origin: *");
    http_response_code($httpcode);
    echo $body;