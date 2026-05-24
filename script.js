// Application State
let companiesList = [];
let loadedQuestions = [];
let currentFilter = 'All';
let currentSortKey = 'id';
let currentSortDir = 'asc';

// Element Cache
const searchInput = document.getElementById('search-input');
const suggestionsDiv = document.getElementById('suggestions');
const blankState = document.getElementById('blank-state');
const companyBoard = document.getElementById('company-board');
const companyTitle = document.getElementById('company-title');
const questionCount = document.getElementById('question-count');
const tableBody = document.getElementById('table-body');
const tableWrapper = document.getElementById('table-wrapper');
const loader = document.getElementById('loader');

// Fetch the Master Company List
fetch('data/companies.json')
    .then(res => res.json())
    .then(data => {
        companiesList = data;
    })
    .catch(err => console.error("Could not fetch the company list", err));

// Input event listener for dropdown suggestions
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    suggestionsDiv.innerHTML = '';

    if (!query) {
        suggestionsDiv.classList.add('hidden');
        return;
    }

    const filtered = companiesList.filter(c => c.toLowerCase().includes(query)).slice(0, 10);

    if (filtered.length > 0) {
        filtered.forEach(company => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `
                <span>${company.replace('-', ' ')}</span>
                <span class="suggestion-action">View Questions</span>
            `;
            div.addEventListener('click', () => {
                selectCompany(company);
            });
            suggestionsDiv.appendChild(div);
        });
        suggestionsDiv.classList.remove('hidden');
    } else {
        suggestionsDiv.classList.add('hidden');
    }
});

// Close suggestions when user clicks outside
document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
        suggestionsDiv.classList.add('hidden');
    }
});

// Load the details for the targeted company
function selectCompany(companyName) {
    searchInput.value = '';
    suggestionsDiv.classList.add('hidden');
    blankState.classList.add('hidden');
    companyBoard.classList.remove('hidden');
    tableWrapper.classList.add('hidden');
    loader.classList.remove('hidden');

    companyTitle.textContent = companyName.replace('-', ' ');

    fetch(`data/${companyName}.json`)
        .then(res => res.json())
        .then(questions => {
            loadedQuestions = questions;
            loader.classList.add('hidden');
            tableWrapper.classList.remove('hidden');
            processAndRender();
        })
        .catch(err => {
            console.error("Error loading questions:", err);
            loader.classList.add('hidden');
        });
}

// Handler for Filter Pills
document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
        document.querySelector('.filter-pill.active').classList.remove('active');
        e.target.classList.add('active');
        currentFilter = e.target.getAttribute('data-difficulty');
        processAndRender();
    });
});

// Handler for Sorting Headers
document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
        const sortKey = th.getAttribute('data-sort');
        if (currentSortKey === sortKey) {
            currentSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
        } else {
            currentSortKey = sortKey;
            currentSortDir = 'asc';
        }
        updateSortIndicators();
        processAndRender();
    });
});

function updateSortIndicators() {
    document.querySelectorAll('th.sortable').forEach(th => {
        const indicator = th.querySelector('.sort-indicator');
        const key = th.getAttribute('data-sort');
        if (key === currentSortKey) {
            indicator.textContent = currentSortDir === 'asc' ? '▲' : '▼';
        } else {
            indicator.textContent = '';
        }
    });
}

// Compute the ordering value for Difficulty categories
function getDiffWeight(difficulty) {
    const diff = difficulty.toLowerCase();
    if (diff === 'easy') return 1;
    if (diff === 'medium') return 2;
    if (diff === 'hard') return 3;
    return 0;
}

// Sort, Filter, and Output Questions inside the table
function processAndRender() {
    // 1. Filter
    let displayList = loadedQuestions.filter(q => {
        if (currentFilter === 'All') return true;
        return q.difficulty.toLowerCase() === currentFilter.toLowerCase();
    });

    questionCount.textContent = `${displayList.length} question${displayList.length === 1 ? '' : 's'}`;

    // 2. Sort
    displayList.sort((a, b) => {
        if (currentSortKey === 'difficulty') {
            const weightA = getDiffWeight(a.difficulty);
            const weightB = getDiffWeight(b.difficulty);
            return currentSortDir === 'asc' ? weightA - weightB : weightB - weightA;
        }

        if (currentSortKey === 'id') {
            const numA = parseInt(a.id, 10) || 0;
            const numB = parseInt(b.id, 10) || 0;
            return currentSortDir === 'asc' ? numA - numB : numB - numA;
        }

        const valA = a[currentSortKey].toString().toLowerCase();
        const valB = b[currentSortKey].toString().toLowerCase();

        if (valA < valB) return currentSortDir === 'asc' ? -1 : 1;
        if (valA > valB) return currentSortDir === 'asc' ? 1 : -1;
        return 0;
    });

    // 3. Render Table rows
    tableBody.innerHTML = '';
    if (displayList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 40px;">No questions matching this filter.</td></tr>`;
        return;
    }

    displayList.forEach(q => {
        const tr = document.createElement('tr');
        const diffLower = q.difficulty.toLowerCase();
        
        tr.innerHTML = `
            <td class="col-id">${q.id}</td>
            <td>
                <a href="${q.link}" target="_blank" rel="noopener noreferrer" class="problem-link">
                    ${q.title}
                </a>
            </td>
            <td>
                <span class="badge badge-${diffLower}">${q.difficulty}</span>
            </td>
            <td style="color: var(--text-muted); font-size: 13px;">${q.acceptance}</td>
        `;
        tableBody.appendChild(tr);
    });
}

