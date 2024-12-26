# GenTodyReading

This project utilizes the AnkiConnect plugin to help you read and learn more efficiently.

## Getting Started

### 1. Install AnkiConnect

Install the **AnkiConnect** add-on in Anki. The add-on code is: **2055492159**.

Installation steps:

1. Open Anki.
2. Click on "Tools" -> "Add-ons" in the menu bar.
3. Click on "Get Add-ons...".
4. In the pop-up window, enter the code `2055492159` and click "OK".
5. Restart Anki.

### 2. Configure AnkiConnect

Open the AnkiConnect configuration file. It's usually located in the `AnkiConnect` subdirectory within Anki's add-ons directory, and the file name is `config.json` or similar. Modify the configuration file to ensure its content matches the following:

```json
{
    "apiKey": null,
    "apiLogPath": null,
    "ignoreOriginList": [],
    "webBindAddress": "127.0.0.1",
    "webBindPort": 8765,
    "webCorsOriginList": [
        "http://localhost",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
}
```

**Explanation:**

*   `webBindAddress`: The address AnkiConnect listens on. Usually set to `127.0.0.1`.
*   `webBindPort`: The port AnkiConnect listens on. Defaults to `8765`.
*   `webCorsOriginList`: A list of origins allowed to make cross-origin requests to AnkiConnect. Since this project starts a web server on the local `3000` port, you need to add `http://localhost:3000` and `http://127.0.0.1:3000` to the list.

### 3. Start a Local Web Server

Download all the files of this project to a local folder. Then, in that folder, open a terminal or command prompt window and execute the following command to start a simple web server:

```bash
python3 -m http.server 3000
```

This will start a web server on the local port `3000`.

**Note:** Make sure you have Python 3 installed on your system.

### 4. Access GenTodyReading

Open the following address in your browser:

```
http://127.0.0.1:3000
```

Now you can start using GenTodyReading!

## Contributing

We welcome suggestions and code contributions to this project!

## License

This project is licensed under the **GNU General Public License v3.0 (GPLv3)**.

**GPLv3 License Summary:**

*   **You can:**
    *   Run the program for any purpose.
    *   Study how the program works and modify it to suit your needs.
    *   Redistribute copies of the program.
    *   Improve the program and release your improvements to the public, benefiting the whole community.

*   **You must:**
    *   Include the original copyright notice and GPLv3 license notice on all copies.
    *   State any significant changes you made to the modified program.
    *   License your modified program or a new program that contains a significant portion of this program under the same GPLv3 license.
    *   Provide the source code.

**For the full GPLv3 license text, please see:** [https://www.gnu.org/licenses/gpl-3.0.html](https://www.gnu.org/licenses/gpl-3.0.html)
