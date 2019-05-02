#!/usr/bin/env python
import os
import markdown
import urllib.request
import pytest

'''
This is a script to deploy the website.

This script WILL NOT push the files to the remote server. It will do the 
necessary stuff before deploy, including:

    * Convert the md files and generate the corresponding html files.
    * Run all the tests and make sure it's clean
'''

FILE_PATH = os.path.dirname(__file__)

def convert_md_to_html():
    # GAME RULS UPDATE
    try:
        game_rules_fp = os.path.join(FILE_PATH, 'web', 'colorfight', 'README.md')
        with open(game_rules_fp) as f:
            md = f.read()
            md = md[:md.find('## Communication')]
            html = markdown.markdown(md, extensions = ['toc', 'tables'])
            game_rules_html_fp = os.path.join(FILE_PATH, 'web', 'templates', 'game_rules_raw.html')
            with open(game_rules_html_fp, 'w') as fw:
                fw.write(html)
                print("Updated the Game Rule Page")
    except Exception as e:
        print(e)
        print("Failed to update the game rule page")

    # API UPDATE
    try:
        data = urllib.request.urlopen('https://raw.githubusercontent.com/gaogaotiantian/ColorfightIIBot/master/README.md').read().decode('ascii')
        html = markdown.markdown(data, extensions = ['toc', 'tables'])
        api_html_fp = os.path.join(FILE_PATH, 'web', 'templates', 'api_raw.html')
        with open(api_html_fp, 'w') as fw:
            fw.write(html)
            print("Updated the API Page")
    except Exception as e:
        print(e)
        print("Failed to update the API page")

def run_tests():
    test_dir = os.path.join(FILE_PATH, 'web', 'colorfight', 'tests')
    pytest.main([test_dir])

if __name__ == '__main__':
    convert_md_to_html()
    run_tests()

