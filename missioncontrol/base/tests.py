from django.core.urlresolvers import reverse
from django.test import TestCase


class HomeTests(TestCase):

    def test_page_title(self):
        response = self.client.get(reverse('home'))
        self.assertIn('<h1>Mission Control Api</h1>', response.content.decode('utf-8'))


class TestContribute(TestCase):

    def test_contribute_json(self):
        response = self.client.get('/contribute.json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/json')
