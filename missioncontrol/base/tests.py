from django.test import TestCase


class HomeTests(TestCase):

    def test_page_title(self):
        response = self.client.get('/')
        self.assertIn('<title>Webpack App</title>',
                      "".join([l.decode('utf-8') for l in response.streaming_content]))


class TestContribute(TestCase):

    def test_contribute_json(self):
        response = self.client.get('/contribute.json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/json')
