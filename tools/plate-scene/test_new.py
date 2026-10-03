"""Launcher invariants: no network or image generation required."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import numpy as np
from PIL import Image

spec = importlib.util.spec_from_file_location('plate_new', Path(__file__).with_name('new.py'))
new = importlib.util.module_from_spec(spec)
spec.loader.exec_module(new)


class NewSceneTests(unittest.TestCase):
    def test_infer_presets_without_scene_specific_code(self):
        a = new.make_spec('example', 'A mountain lake beside a forest')
        self.assertIn('water', a['keys'])
        self.assertNotIn('road', a['keys'])
        self.assertIn('No artificial lighting', a['night_lights'])
        b = new.make_spec('example', 'A quiet harbour', requested={'boats', 'traffic', 'walkers'})
        self.assertIn('water', b['generator']['presets'])
        self.assertTrue({'water', 'road', 'walk'} <= b['keys'].keys())
        self.assertIn('Preserve EVERY pixel', new.prompts.edit(b, 'night'))

    def test_no_route_for_empty_or_thin_mask(self):
        with tempfile.TemporaryDirectory() as folder:
            p = Path(folder) / 'mask.png'
            self.assertIsNone(new.derive_path(p))
            m = np.zeros((160, 256), dtype=np.uint8)
            m[90, 30:150] = 255
            Image.fromarray(m).save(p)
            self.assertIsNone(new.derive_path(p))

    def test_routes_do_not_cross_holes_or_disconnected_banks(self):
        with tempfile.TemporaryDirectory() as folder:
            p = Path(folder) / 'mask.png'
            m = np.zeros((160, 256), dtype=np.uint8)
            m[68:118, 20:164] = 255
            m[68:102, 72:104] = 0  # peninsula: route must go around its end
            m[70:105, 190:230] = 255  # separate component
            Image.fromarray(m).save(p)
            route = new.derive_path(p)
            self.assertIsNotNone(route)
            for a, b in zip(route, route[1:]):
                for u in np.linspace(0, 1, 101):
                    x, y = np.array(a) * (1-u) + np.array(b) * u
                    self.assertGreater(m[int(y*160), int(x*256)], 235)
                    self.assertLess(x, .69)
            self.assertTrue(any(y > 102/160 for x, y in route))

    def test_reject_traversal_unknown_presets_and_owned_ids(self):
        for args in (['../escape', 'place'], ['airport', 'place'], ['test', 'place', '--presets', 'lava']):
            with self.assertRaises(SystemExit): new.main(args)

    def test_resume_ownership_and_input_mismatch(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(new, 'ROOT', Path(folder)):
            self.assertEqual(new.main(['example', 'A garden', '--prepare-only']), 0)
            with self.assertRaises(SystemExit): new.main(['example', 'A garden', '--prepare-only'])
            with self.assertRaises(SystemExit): new.main(['example', 'A desert', '--prepare-only', '--resume'])
            self.assertEqual(new.main(['example', 'A garden', '--prepare-only', '--resume']), 0)

    def test_success_exit_from_gen_is_not_enough(self):
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaisesRegex(RuntimeError, 'Generation did not produce'):
                new.validate_generation(Path(folder), new.make_spec('example', 'A garden'))

    def test_pipeline_failure_records_stage_and_does_not_package(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(new, 'ROOT', Path(folder)):
            with patch.object(new.subprocess, 'run') as process, patch.object(new.shutil, 'which', return_value='/bin/codex'):
                with self.assertRaisesRegex(RuntimeError, 'Generation did not produce'):
                    new.main(['example', 'A garden'])
                self.assertEqual(process.call_count, 1)
            run = json.loads((Path(folder)/'art-src/example/timings.json').read_text())['runs'][0]
            self.assertEqual(run['status'], 'failed')
            self.assertEqual(run['stages'][0]['status'], 'failed')
            self.assertGreaterEqual(run['seconds'], 0)


if __name__ == '__main__': unittest.main()
