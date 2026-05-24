#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <string>
#include <filesystem>
#include <algorithm>
#include <map>

namespace fs = std::filesystem;

// Structure to hold individual question information
struct Question {
    std::string id;
    std::string title;
    std::string acceptance;
    std::string difficulty;
    std::string link;
};

// Trim whitespace and quotation marks from strings
std::string trim(const std::string& str) {
    size_t first = str.find_first_not_of(" \t\r\n\"");
    if (std::string::npos == first) return "";
    size_t last = str.find_last_not_of(" \t\r\n\"");
    return str.substr(first, (last - first + 1));
}

// Simple JSON string escaper
std::string escapeJSON(const std::string& input) {
    std::string output;
    for (char c : input) {
        if (c == '"') output += "\\\"";
        else if (c == '\\') output += "\\\\";
        else if (c == '\b') output += "\\b";
        else if (c == '\f') output += "\\f";
        else if (c == '\n') output += "\\n";
        else if (c == '\r') output += "\\r";
        else if (c == '\t') output += "\\t";
        else output += c;
    }
    return output;
}

// Simple CSV line parser that respects quotes
std::vector<std::string> parseCSVLine(const std::string& line) {
    std::vector<std::string> result;
    std::string current;
    bool inQuotes = false;
    for (size_t i = 0; i < line.size(); ++i) {
        char c = line[i];
        if (c == '"') {
            inQuotes = !inQuotes;
        } else if (c == ',' && !inQuotes) {
            result.push_back(trim(current));
            current.clear();
        } else {
            current += c;
        }
    }
    result.push_back(trim(current));
    return result;
}

// Check and match headers dynamically
std::map<std::string, int> parseHeaders(const std::vector<std::string>& headers) {
    std::map<std::string, int> headerMap;
    for (size_t i = 0; i < headers.size(); ++i) {
        std::string h = headers[i];
        std::transform(h.begin(), h.end(), h.begin(), ::tolower);
        
        if (h == "id" || h == "question id" || h == "#") {
            headerMap["id"] = i;
        } else if (h == "title" || h == "question title") {
            headerMap["title"] = i;
        } else if (h == "acceptance" || h == "acceptance %") {
            headerMap["acceptance"] = i;
        } else if (h == "difficulty") {
            headerMap["difficulty"] = i;
        } else if (h == "leetcode question link" || h == "link" || h == "url") {
            headerMap["link"] = i;
        }
    }
    return headerMap;
}

int main() {
    std::string repoPath = "./leetcode-companywise-interview-questions";
    std::string outputDir = "./data";

    if (!fs::exists(outputDir)) {
        fs::create_directories(outputDir);
    }

    std::vector<std::string> companies;

    // Scan the cloned repository directory
    for (const auto& entry : fs::directory_iterator(repoPath)) {
        if (entry.is_directory()) {
            std::string folderName = entry.path().filename().string();
            if (folderName[0] == '.') continue; // Skip hidden folders

            std::string csvPath = entry.path().string() + "/all.csv";
            if (fs::exists(csvPath)) {
                companies.push_back(folderName);
                std::ifstream csvFile(csvPath);
                
                if (!csvFile.is_open()) {
                    std::cerr << "Failed to open " << csvPath << std::endl;
                    continue;
                }

                std::string line;
                std::vector<Question> questions;
                std::map<std::string, int> headerIndices;

                // Read Header Line
                if (std::getline(csvFile, line)) {
                    std::vector<std::string> headers = parseCSVLine(line);
                    headerIndices = parseHeaders(headers);
                }

                // Default columns if headers are missing
                int idxID = headerIndices.count("id") ? headerIndices["id"] : 0;
                int idxTitle = headerIndices.count("title") ? headerIndices["title"] : 1;
                int idxAcceptance = headerIndices.count("acceptance") ? headerIndices["acceptance"] : 2;
                int idxDifficulty = headerIndices.count("difficulty") ? headerIndices["difficulty"] : 3;
                int idxLink = headerIndices.count("link") ? headerIndices["link"] : 5;

                while (std::getline(csvFile, line)) {
                    if (line.empty()) continue;
                    std::vector<std::string> row = parseCSVLine(line);
                    
                    if (row.size() <= std::max({idxID, idxTitle, idxAcceptance, idxDifficulty, idxLink})) {
                        continue;
                    }

                    Question q;
                    q.id = row[idxID];
                    q.title = row[idxTitle];
                    q.acceptance = row[idxAcceptance];
                    q.difficulty = row[idxDifficulty];
                    q.link = row[idxLink];
                    questions.push_back(q);
                }

                csvFile.close();

                // Generate specific JSON for the company
                std::string outPath = outputDir + "/" + folderName + ".json";
                std::ofstream outFile(outPath);
                
                outFile << "[\n";
                for (size_t i = 0; i < questions.size(); ++i) {
                    outFile << "  {\n";
                    outFile << "    \"id\": \"" << escapeJSON(questions[i].id) << "\",\n";
                    outFile << "    \"title\": \"" << escapeJSON(questions[i].title) << "\",\n";
                    outFile << "    \"acceptance\": \"" << escapeJSON(questions[i].acceptance) << "\",\n";
                    outFile << "    \"difficulty\": \"" << escapeJSON(questions[i].difficulty) << "\",\n";
                    outFile << "    \"link\": \"" << escapeJSON(questions[i].link) << "\"\n";
                    outFile << "  }" << (i == questions.size() - 1 ? "" : ",") << "\n";
                }
                outFile << "]";
                outFile.close();
            }
        }
    }

    // Sort company names alphabetically
    std::sort(companies.begin(), companies.end());

    // Generate companies master index JSON
    std::ofstream masterFile(outputDir + "/companies.json");
    masterFile << "[\n";
    for (size_t i = 0; i < companies.size(); ++i) {
        masterFile << "  \"" << escapeJSON(companies[i]) << "\"" << (i == companies.size() - 1 ? "" : ",") << "\n";
    }
    masterFile << "]";
    masterFile.close();

    std::cout << "Data parsing finished. Handled " << companies.size() << " companies." << std::endl;
    return 0;
}

