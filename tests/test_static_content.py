def test_page_title(client):
    response = client.get('/')
    assert '<title>Webpack App</title>' in "".join([l.decode('utf-8') for l in
                                                    response.streaming_content])


def test_contribute_json(client):
    response = client.get('/contribute.json')
    assert response.status_code == 200
    assert response['Content-Type'] == 'application/json'
