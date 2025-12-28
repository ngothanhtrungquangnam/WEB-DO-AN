This is a project about the Weekly Schedule Manager. To develop your own website based on this GitHub, you have to do:
1. Clone this project.
2. Open the quan-ly-lich-tuan folder, and change all the URLs in some files in this folder: 'https://lich-tuan-api-bcg9d2aqfgbwbbcv.eastasia-01.azurewebsites.net' to your localhost link.
   For example, change this code line 'const BASE_API_URL = 'https://lich-tuan-api-bcg9d2aqfgbwbbcv.eastasia-01.azurewebsites.net/api' to const BASE_API_URL = window.location.origin + '/api'. You have to do the same for all the files in that folder
   Then, in the package.json file in the same folder, add this line: "proxy": "http://localhost:8080", before the "dependencies".  
4. Download all the npm through this command 'npm install' in 2 folders: quan-ly-lich-tuan and schedule-backend. You have to open 2 terminals and type cd into each folder.
5. Once you finish, just type the command 'npm start' in both 2 terminals in the 2 folders listed before. The web will appear on your localhost link.
