"""Testes do ping que mantém o Render acordado (não sobe o servidor)."""
import unittest

import keepalive


class TesteKeepalive(unittest.TestCase):
    def test_desligado_local_sem_env(self):
        self.assertFalse(keepalive.ativo({}))

    def test_ligado_no_render(self):
        self.assertTrue(keepalive.ativo({'RENDER': 'true'}))

    def test_keepalive_0_vence_o_render(self):
        self.assertFalse(keepalive.ativo({'RENDER': 'true', 'KEEPALIVE': '0'}))

    def test_keepalive_1_liga_local(self):
        self.assertTrue(keepalive.ativo({'KEEPALIVE': '1'}))

    def test_url_padrao(self):
        self.assertEqual(keepalive.url_status({}), 'https://tudo-busca.onrender.com/api/status')

    def test_url_do_render(self):
        self.assertEqual(
            keepalive.url_status({'RENDER_EXTERNAL_URL': 'https://tudo-busca.onrender.com/'}),
            'https://tudo-busca.onrender.com/api/status',
        )

    def test_intervalo_padrao_e_invalido(self):
        self.assertEqual(keepalive._int_env('KEEPALIVE_INTERVALO', 600, {}), 600)
        self.assertEqual(keepalive._int_env('KEEPALIVE_INTERVALO', 600, {'KEEPALIVE_INTERVALO': 'abc'}), 600)
        self.assertEqual(keepalive._int_env('KEEPALIVE_ESPERA', 60, {'KEEPALIVE_ESPERA': '45'}), 45)


if __name__ == '__main__':
    unittest.main()
