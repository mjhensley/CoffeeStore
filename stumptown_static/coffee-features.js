// =========================================================
// GRAINHOUSE COFFEE - 6 UNIQUE INNOVATIVE FEATURES
// =========================================================

// =========================================================
// FEATURE 1: INTERACTIVE COFFEE FLAVOR WHEEL
// Visual exploration of flavor profiles
// =========================================================
const FlavorWheel = {
    flavors: {
        fruity: { 
            color: '#FF6B6B', 
            subcategories: ['Berry', 'Citrus', 'Stone Fruit', 'Tropical'],
            coffees: ['ethiopia-mordecofe', 'ethiopia-suke-quto', 'ethiopia-duromina']
        },
        floral: { 
            color: '#C77DFF', 
            subcategories: ['Jasmine', 'Lavender', 'Rose', 'Chamomile'],
            coffees: ['ethiopia-mordecofe', 'ethiopia-suke-quto']
        },
        sweet: { 
            color: '#FFB347', 
            subcategories: ['Caramel', 'Honey', 'Brown Sugar', 'Maple'],
            coffees: ['holler-mountain', 'guatemala-injerto', 'homestead']
        },
        nutty: { 
            color: '#D4A574', 
            subcategories: ['Almond', 'Hazelnut', 'Walnut', 'Peanut'],
            coffees: ['guatemala-injerto', 'hundred-mile', 'guatemala-bella-vista']
        },
        chocolate: { 
            color: '#8B4513', 
            subcategories: ['Dark Chocolate', 'Milk Chocolate', 'Cocoa', 'Mocha'],
            coffees: ['hair-bender', 'indonesia-bies', 'french-roast']
        },
        spicy: { 
            color: '#E07B39', 
            subcategories: ['Cinnamon', 'Clove', 'Ginger', 'Cardamom'],
            coffees: ['indonesia-bies', 'french-roast']
        },
        earthy: { 
            color: '#6B8E23', 
            subcategories: ['Cedar', 'Tobacco', 'Leather', 'Mushroom'],
            coffees: ['indonesia-bies', 'french-roast']
        },
        roasty: { 
            color: '#4A3728', 
            subcategories: ['Smoky', 'Toast', 'Burnt Sugar', 'Pipe Tobacco'],
            coffees: ['french-roast', 'hundred-mile']
        }
    },
    
    init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = this.render();
        this.attachEvents(container);
    },
    
    render() {
        const segments = Object.entries(this.flavors);
        const segmentAngle = 360 / segments.length;
        
        return `
            <div class="flavor-wheel-container">
                <h3 class="wheel-title">🎨 Explore Coffee Flavors</h3>
                <p class="wheel-subtitle">Click a flavor to discover matching coffees</p>
                <div class="wheel-wrapper">
                    <svg viewBox="0 0 400 400" class="flavor-wheel-svg">
                        ${segments.map(([name, data], i) => {
                            const startAngle = i * segmentAngle - 90;
                            const endAngle = (i + 1) * segmentAngle - 90;
                            return this.createSegment(name, data, startAngle, endAngle, 200, 200, 180);
                        }).join('')}
                        <circle cx="200" cy="200" r="60" fill="#f5f0e8" stroke="#4a3728" stroke-width="2"/>
                        <text x="200" y="195" text-anchor="middle" class="wheel-center-text" fill="#4a3728" font-size="14" font-weight="600">Click a</text>
                        <text x="200" y="215" text-anchor="middle" class="wheel-center-text" fill="#4a3728" font-size="14" font-weight="600">Flavor</text>
                    </svg>
                </div>
                <div class="wheel-results" id="wheelResults"></div>
            </div>
        `;
    },
    
    createSegment(name, data, startAngle, endAngle, cx, cy, radius) {
        const start = this.polarToCartesian(cx, cy, radius, endAngle);
        const end = this.polarToCartesian(cx, cy, radius, startAngle);
        const innerStart = this.polarToCartesian(cx, cy, 60, endAngle);
        const innerEnd = this.polarToCartesian(cx, cy, 60, startAngle);
        const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
        
        const midAngle = (startAngle + endAngle) / 2;
        const labelPos = this.polarToCartesian(cx, cy, radius * 0.7, midAngle);
        
        return `
            <g class="flavor-segment" data-flavor="${name}">
                <path d="M ${innerStart.x} ${innerStart.y} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y} L ${innerEnd.x} ${innerEnd.y} A 60 60 0 ${largeArc} 1 ${innerStart.x} ${innerStart.y}" 
                    fill="${data.color}" stroke="#fff" stroke-width="2" class="segment-path"/>
                <text x="${labelPos.x}" y="${labelPos.y}" text-anchor="middle" dominant-baseline="middle" 
                    fill="#fff" font-size="12" font-weight="600" class="segment-label" style="text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">
                    ${name.charAt(0).toUpperCase() + name.slice(1)}
                </text>
            </g>
        `;
    },
    
    polarToCartesian(cx, cy, radius, angle) {
        const rad = (angle * Math.PI) / 180;
        return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
    },
    
    attachEvents(container) {
        container.querySelectorAll('.flavor-segment').forEach(segment => {
            segment.addEventListener('click', (e) => {
                const flavor = e.currentTarget.dataset.flavor;
                this.showResults(flavor, container);
            });
            segment.addEventListener('mouseenter', (e) => {
                e.currentTarget.querySelector('.segment-path').style.opacity = '0.8';
                e.currentTarget.style.transform = 'scale(1.02)';
            });
            segment.addEventListener('mouseleave', (e) => {
                e.currentTarget.querySelector('.segment-path').style.opacity = '1';
                e.currentTarget.style.transform = 'scale(1)';
            });
        });
    },
    
    showResults(flavor, container) {
        const data = this.flavors[flavor];
        const resultsDiv = container.querySelector('#wheelResults');
        const products = typeof getAllProducts === 'function' ? getAllProducts() : [];
        const matchingProducts = products.filter(p => data.coffees.includes(p.id));
        
        resultsDiv.innerHTML = `
            <div class="wheel-result-card" style="border-left: 4px solid ${data.color}">
                <h4>${flavor.charAt(0).toUpperCase() + flavor.slice(1)} Coffees</h4>
                <p class="flavor-notes">Notes: ${data.subcategories.join(', ')}</p>
                <div class="matching-coffees">
                    ${matchingProducts.map(p => `
                        <a href="#" class="matching-coffee-item" data-product="${p.id}">
                            <span class="coffee-name">${p.name}</span>
                            <span class="coffee-price">$${p.price.toFixed(2)}</span>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }
};

// =========================================================
// FEATURE 2: AI-POWERED COFFEE PAIRING RECOMMENDATIONS
// Smart food & occasion pairings
// =========================================================
const CoffeePairing = {
    occasions: {
        morning: { icon: '🌅', name: 'Morning Routine', description: 'Energizing start' },
        brunch: { icon: '🥐', name: 'Brunch', description: 'Perfect with pastries' },
        afternoon: { icon: '☀️', name: 'Afternoon Pick-me-up', description: '3pm slump buster' },
        evening: { icon: '🌙', name: 'Evening Relaxation', description: 'Wind down time' },
        dessert: { icon: '🍰', name: 'After Dessert', description: 'Sweet finisher' },
        work: { icon: '💼', name: 'Work Focus', description: 'Deep concentration' },
        social: { icon: '👥', name: 'Social Gathering', description: 'Entertaining guests' },
        outdoor: { icon: '🏕️', name: 'Outdoor Adventure', description: 'Camping & hiking' }
    },
    
    foods: {
        chocolate: { icon: '🍫', name: 'Chocolate', coffees: ['hair-bender', 'indonesia-bies', 'french-roast'] },
        pastries: { icon: '🥐', name: 'Pastries', coffees: ['holler-mountain', 'founders-blend', 'homestead'] },
        fruit: { icon: '🍓', name: 'Fresh Fruit', coffees: ['ethiopia-mordecofe', 'ethiopia-duromina', 'costa-rica-montes'] },
        cheese: { icon: '🧀', name: 'Cheese', coffees: ['french-roast', 'indonesia-bies', 'hundred-mile'] },
        nuts: { icon: '🥜', name: 'Nuts', coffees: ['guatemala-injerto', 'guatemala-bella-vista', 'hundred-mile'] },
        bacon: { icon: '🥓', name: 'Breakfast Foods', coffees: ['holler-mountain', 'hair-bender', 'homestead'] },
        cake: { icon: '🎂', name: 'Cake & Desserts', coffees: ['trapper-creek-decaf', 'ethiopia-suke-quto', 'guatemala-injerto'] },
        ice_cream: { icon: '🍨', name: 'Ice Cream', coffees: ['cold-brew-concentrate', 'french-roast-cold-brew'] }
    },
    
    init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = this.render();
        this.attachEvents(container);
    },
    
    render() {
        return `
            <div class="pairing-container">
                <h3 class="pairing-title">🍽️ Perfect Pairings</h3>
                <p class="pairing-subtitle">What are you in the mood for?</p>
                
                <div class="pairing-tabs">
                    <button class="pairing-tab active" data-tab="occasion">By Occasion</button>
                    <button class="pairing-tab" data-tab="food">By Food</button>
                </div>
                
                <div class="pairing-content" id="pairingContent">
                    ${this.renderOccasions()}
                </div>
                
                <div class="pairing-results" id="pairingResults"></div>
            </div>
        `;
    },
    
    renderOccasions() {
        return `
            <div class="occasion-grid">
                ${Object.entries(this.occasions).map(([key, o]) => `
                    <button class="occasion-card" data-occasion="${key}">
                        <span class="occasion-icon">${o.icon}</span>
                        <span class="occasion-name">${o.name}</span>
                        <span class="occasion-desc">${o.description}</span>
                    </button>
                `).join('')}
            </div>
        `;
    },
    
    renderFoods() {
        return `
            <div class="food-grid">
                ${Object.entries(this.foods).map(([key, f]) => `
                    <button class="food-card" data-food="${key}">
                        <span class="food-icon">${f.icon}</span>
                        <span class="food-name">${f.name}</span>
                    </button>
                `).join('')}
            </div>
        `;
    },
    
    attachEvents(container) {
        container.querySelectorAll('.pairing-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                container.querySelectorAll('.pairing-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                const tabType = e.target.dataset.tab;
                const content = container.querySelector('#pairingContent');
                content.innerHTML = tabType === 'occasion' ? this.renderOccasions() : this.renderFoods();
                this.attachCardEvents(container);
            });
        });
        this.attachCardEvents(container);
    },
    
    attachCardEvents(container) {
        container.querySelectorAll('.occasion-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const occasion = e.currentTarget.dataset.occasion;
                this.showOccasionRecommendation(occasion, container);
            });
        });
        container.querySelectorAll('.food-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const food = e.currentTarget.dataset.food;
                this.showFoodPairing(food, container);
            });
        });
    },
    
    showOccasionRecommendation(occasion, container) {
        const occasionData = this.occasions[occasion];
        const products = typeof getAllProducts === 'function' ? getAllProducts() : [];
        
        // Smart matching based on occasion
        const recommendations = {
            morning: products.filter(p => p.caffeineLevel === 'Medium-High' || p.caffeineLevel === 'High'),
            brunch: products.filter(p => ['holler-mountain', 'founders-blend', 'homestead'].includes(p.id)),
            afternoon: products.filter(p => p.caffeineLevel === 'Medium'),
            evening: products.filter(p => p.category === 'decaf' || p.caffeineLevel === 'Decaf'),
            dessert: products.filter(p => ['trapper-creek-decaf', 'ethiopia-mordecofe'].includes(p.id)),
            work: products.filter(p => p.caffeineLevel === 'Medium-High' || p.caffeineLevel === 'High'),
            social: products.filter(p => ['hair-bender', 'holler-mountain'].includes(p.id)),
            outdoor: products.filter(p => p.category === 'cold-brew' || ['french-roast'].includes(p.id))
        };
        
        const recs = recommendations[occasion] || products.slice(0, 3);
        this.displayResults(occasionData.icon, occasionData.name, recs.slice(0, 3), container);
    },
    
    showFoodPairing(food, container) {
        const foodData = this.foods[food];
        const products = typeof getAllProducts === 'function' ? getAllProducts() : [];
        const matchingProducts = products.filter(p => foodData.coffees.includes(p.id));
        this.displayResults(foodData.icon, `Pairs with ${foodData.name}`, matchingProducts, container);
    },
    
    displayResults(icon, title, products, container) {
        const resultsDiv = container.querySelector('#pairingResults');
        resultsDiv.innerHTML = `
            <div class="pairing-result-card">
                <div class="result-header">
                    <span class="result-icon">${icon}</span>
                    <h4>${title}</h4>
                </div>
                <div class="recommended-coffees">
                    ${products.map(p => `
                        <div class="recommended-coffee">
                            <img src="${p.image}" alt="${p.name}" onerror="this.style.display='none'">
                            <div class="coffee-details">
                                <strong>${p.name}</strong>
                                <span class="coffee-notes">${p.notes}</span>
                                <span class="coffee-price">$${p.price.toFixed(2)}</span>
                            </div>
                            <button class="quick-add-pairing snipcart-add-item"
                                data-item-id="${p.id}"
                                data-item-name="${p.name}"
                                data-item-price="${p.price}"
                                data-item-url="https://grainhousecoffee.com/collections.html"
                                data-item-image="${p.image}">
                                Add
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
};

// =========================================================
// FEATURE 3: COFFEE FRESHNESS COUNTDOWN TIMER
// Shows peak freshness window
// =========================================================
const FreshnessTimer = {
    // Simulated roast dates (in real app, this would come from backend)
    getSimulatedRoastDate() {
        // Random date between 1-7 days ago
        const daysAgo = Math.floor(Math.random() * 7) + 1;
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date;
    },
    
    calculateFreshness(roastDate) {
        const now = new Date();
        const diffTime = now - roastDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        // Peak freshness: 3-14 days, good: 14-30 days, declining: 30+ days
        if (diffDays <= 3) {
            return { status: 'degassing', percent: 100, message: 'Degassing - Perfect in 2-3 days', color: '#FFB347' };
        } else if (diffDays <= 14) {
            return { status: 'peak', percent: 100 - ((diffDays - 3) * 3), message: 'Peak Freshness!', color: '#4CAF50' };
        } else if (diffDays <= 30) {
            return { status: 'good', percent: 70 - ((diffDays - 14) * 2), message: 'Still Fresh', color: '#c9a96e' };
        } else {
            return { status: 'declining', percent: Math.max(20, 40 - (diffDays - 30)), message: 'Best consumed soon', color: '#E07B39' };
        }
    },
    
    init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = this.render();
        this.startCountdown(container);
    },
    
    render() {
        const roastDate = this.getSimulatedRoastDate();
        const freshness = this.calculateFreshness(roastDate);
        const peakEndDate = new Date(roastDate);
        peakEndDate.setDate(peakEndDate.getDate() + 14);
        
        return `
            <div class="freshness-container">
                <h3 class="freshness-title">⏱️ Freshness Guarantee</h3>
                <div class="freshness-card">
                    <div class="roast-date">
                        <span class="roast-label">Roasted</span>
                        <span class="roast-value">${roastDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div class="freshness-meter">
                        <div class="meter-label">${freshness.message}</div>
                        <div class="meter-bar">
                            <div class="meter-fill" style="width: ${freshness.percent}%; background: ${freshness.color}"></div>
                        </div>
                        <div class="meter-percent">${freshness.percent}% Fresh</div>
                    </div>
                    <div class="peak-countdown">
                        <span class="peak-label">Peak freshness window ends in:</span>
                        <div class="countdown-timer" id="peakCountdown" data-end="${peakEndDate.getTime()}">
                            <div class="time-unit"><span class="time-value">--</span><span class="time-label">Days</span></div>
                            <div class="time-unit"><span class="time-value">--</span><span class="time-label">Hours</span></div>
                            <div class="time-unit"><span class="time-value">--</span><span class="time-label">Min</span></div>
                        </div>
                    </div>
                </div>
                <p class="freshness-tip">💡 Tip: Store in an airtight container away from light, heat, and moisture.</p>
            </div>
        `;
    },
    
    startCountdown(container) {
        const countdownEl = container.querySelector('#peakCountdown');
        if (!countdownEl) return;
        
        const endTime = parseInt(countdownEl.dataset.end);
        
        const updateCountdown = () => {
            const now = Date.now();
            const diff = Math.max(0, endTime - now);
            
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            
            const values = countdownEl.querySelectorAll('.time-value');
            if (values[0]) values[0].textContent = days.toString().padStart(2, '0');
            if (values[1]) values[1].textContent = hours.toString().padStart(2, '0');
            if (values[2]) values[2].textContent = mins.toString().padStart(2, '0');
        };
        
        updateCountdown();
        setInterval(updateCountdown, 60000);
    }
};

// =========================================================
// FEATURE 4: INTERACTIVE BREW CALCULATOR
// Calculate perfect ratios and times
// =========================================================
const BrewCalculator = {
    methods: {
        pourover: { name: 'Pour Over', ratio: 16, time: '3:00-4:00', temp: '195-205°F', grind: 'Medium-Fine' },
        frenchpress: { name: 'French Press', ratio: 15, time: '4:00', temp: '195-205°F', grind: 'Coarse' },
        aeropress: { name: 'AeroPress', ratio: 14, time: '1:30-2:00', temp: '175-185°F', grind: 'Fine-Medium' },
        chemex: { name: 'Chemex', ratio: 17, time: '4:00-5:00', temp: '195-205°F', grind: 'Medium-Coarse' },
        drip: { name: 'Drip Coffee', ratio: 16, time: '5:00-6:00', temp: '195-205°F', grind: 'Medium' },
        coldbrew: { name: 'Cold Brew', ratio: 8, time: '12-24 hours', temp: 'Room Temp/Cold', grind: 'Extra Coarse' },
        espresso: { name: 'Espresso', ratio: 2, time: '25-30 sec', temp: '195-205°F', grind: 'Fine' },
        moka: { name: 'Moka Pot', ratio: 10, time: '4:00-5:00', temp: 'Stovetop', grind: 'Fine-Medium' }
    },
    
    init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = this.render();
        this.attachEvents(container);
    },
    
    render() {
        return `
            <div class="brew-calc-container">
                <h3 class="brew-calc-title">☕ Brew Calculator</h3>
                <p class="brew-calc-subtitle">Get the perfect coffee-to-water ratio</p>
                
                <div class="calc-form">
                    <div class="calc-row">
                        <label>Brew Method</label>
                        <select id="brewMethod" class="calc-select">
                            ${Object.entries(this.methods).map(([key, m]) => 
                                `<option value="${key}">${m.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    
                    <div class="calc-row">
                        <label>Cups Desired</label>
                        <div class="cups-selector">
                            ${[1, 2, 3, 4, 6, 8].map(c => 
                                `<button class="cup-btn ${c === 2 ? 'active' : ''}" data-cups="${c}">${c}</button>`
                            ).join('')}
                        </div>
                    </div>
                    
                    <div class="calc-row">
                        <label>Strength Preference</label>
                        <input type="range" id="strengthSlider" min="1" max="5" value="3" class="strength-slider">
                        <div class="strength-labels">
                            <span>Light</span>
                            <span>Strong</span>
                        </div>
                    </div>
                </div>
                
                <div class="calc-results" id="calcResults">
                    <div class="result-item">
                        <div class="result-icon">⚖️</div>
                        <div class="result-data">
                            <span class="result-label">Coffee</span>
                            <span class="result-value" id="coffeeAmount">30g</span>
                        </div>
                    </div>
                    <div class="result-item">
                        <div class="result-icon">💧</div>
                        <div class="result-data">
                            <span class="result-label">Water</span>
                            <span class="result-value" id="waterAmount">480ml</span>
                        </div>
                    </div>
                    <div class="result-item">
                        <div class="result-icon">🕐</div>
                        <div class="result-data">
                            <span class="result-label">Brew Time</span>
                            <span class="result-value" id="brewTime">3:00-4:00</span>
                        </div>
                    </div>
                    <div class="result-item">
                        <div class="result-icon">🌡️</div>
                        <div class="result-data">
                            <span class="result-label">Water Temp</span>
                            <span class="result-value" id="waterTemp">195-205°F</span>
                        </div>
                    </div>
                    <div class="result-item full-width">
                        <div class="result-icon">🔸</div>
                        <div class="result-data">
                            <span class="result-label">Grind Size</span>
                            <span class="result-value" id="grindSize">Medium-Fine</span>
                        </div>
                    </div>
                </div>
                
                <button class="start-timer-btn" id="startTimerBtn">⏱️ Start Brew Timer</button>
                <div class="brew-timer" id="brewTimer" style="display: none;">
                    <div class="timer-display" id="timerDisplay">00:00</div>
                    <div class="timer-controls">
                        <button class="timer-btn" id="pauseTimer">Pause</button>
                        <button class="timer-btn" id="resetTimer">Reset</button>
                    </div>
                </div>
            </div>
        `;
    },
    
    attachEvents(container) {
        const method = container.querySelector('#brewMethod');
        const strength = container.querySelector('#strengthSlider');
        const cups = container.querySelectorAll('.cup-btn');
        
        let selectedCups = 2;
        
        const updateResults = () => {
            const methodData = this.methods[method.value];
            const strengthMod = (parseInt(strength.value) - 3) * 0.1;
            const adjustedRatio = methodData.ratio * (1 - strengthMod);
            
            const waterPerCup = 240; // ml per cup
            const totalWater = selectedCups * waterPerCup;
            const coffeeGrams = Math.round(totalWater / adjustedRatio);
            
            container.querySelector('#coffeeAmount').textContent = `${coffeeGrams}g`;
            container.querySelector('#waterAmount').textContent = `${totalWater}ml`;
            container.querySelector('#brewTime').textContent = methodData.time;
            container.querySelector('#waterTemp').textContent = methodData.temp;
            container.querySelector('#grindSize').textContent = methodData.grind;
        };
        
        method.addEventListener('change', updateResults);
        strength.addEventListener('input', updateResults);
        
        cups.forEach(btn => {
            btn.addEventListener('click', () => {
                cups.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedCups = parseInt(btn.dataset.cups);
                updateResults();
            });
        });
        
        // Timer functionality
        const startBtn = container.querySelector('#startTimerBtn');
        const timerDiv = container.querySelector('#brewTimer');
        const timerDisplay = container.querySelector('#timerDisplay');
        const pauseBtn = container.querySelector('#pauseTimer');
        const resetBtn = container.querySelector('#resetTimer');
        
        let timerInterval;
        let seconds = 0;
        let isPaused = false;
        
        startBtn.addEventListener('click', () => {
            timerDiv.style.display = 'block';
            startBtn.style.display = 'none';
            seconds = 0;
            isPaused = false;
            
            timerInterval = setInterval(() => {
                if (!isPaused) {
                    seconds++;
                    const mins = Math.floor(seconds / 60);
                    const secs = seconds % 60;
                    timerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                }
            }, 1000);
        });
        
        pauseBtn.addEventListener('click', () => {
            isPaused = !isPaused;
            pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
        });
        
        resetBtn.addEventListener('click', () => {
            clearInterval(timerInterval);
            timerDiv.style.display = 'none';
            startBtn.style.display = 'block';
            seconds = 0;
            isPaused = false;
            pauseBtn.textContent = 'Pause';
        });
        
        updateResults();
    }
};

// =========================================================
// FEATURE 5: VIRTUAL TASTING NOTES JOURNAL
// Save personal notes on coffees
// =========================================================
const TastingJournal = {
    getEntries() {
        const entries = localStorage.getItem('coffeeJournal');
        return entries ? JSON.parse(entries) : [];
    },
    
    saveEntry(entry) {
        const entries = this.getEntries();
        entry.id = Date.now();
        entry.date = new Date().toISOString();
        entries.unshift(entry);
        localStorage.setItem('coffeeJournal', JSON.stringify(entries));
        return entry;
    },
    
    deleteEntry(id) {
        const entries = this.getEntries().filter(e => e.id !== id);
        localStorage.setItem('coffeeJournal', JSON.stringify(entries));
    },
    
    init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = this.render();
        this.attachEvents(container);
        this.renderEntries(container);
    },
    
    render() {
        return `
            <div class="journal-container">
                <h3 class="journal-title">📓 My Tasting Journal</h3>
                <p class="journal-subtitle">Record your coffee experiences</p>
                
                <button class="new-entry-btn" id="newEntryBtn">+ New Tasting Note</button>
                
                <div class="journal-form" id="journalForm" style="display: none;">
                    <div class="form-row">
                        <label>Coffee Name</label>
                        <input type="text" id="coffeeName" placeholder="e.g., Ethiopia Mordecofe" class="journal-input">
                    </div>
                    
                    <div class="form-row">
                        <label>Brew Method</label>
                        <select id="journalBrewMethod" class="journal-select">
                            <option value="">Select method...</option>
                            <option value="Pour Over">Pour Over</option>
                            <option value="French Press">French Press</option>
                            <option value="Espresso">Espresso</option>
                            <option value="AeroPress">AeroPress</option>
                            <option value="Drip">Drip</option>
                            <option value="Cold Brew">Cold Brew</option>
                        </select>
                    </div>
                    
                    <div class="form-row">
                        <label>Flavor Notes (what did you taste?)</label>
                        <input type="text" id="flavorNotes" placeholder="e.g., blueberry, chocolate, honey" class="journal-input">
                    </div>
                    
                    <div class="form-row rating-row">
                        <label>Your Rating</label>
                        <div class="star-rating" id="starRating">
                            ${[1,2,3,4,5].map(i => `<span class="star" data-rating="${i}">☆</span>`).join('')}
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <label>Additional Notes</label>
                        <textarea id="additionalNotes" placeholder="Any other thoughts..." class="journal-textarea"></textarea>
                    </div>
                    
                    <div class="form-buttons">
                        <button class="cancel-btn" id="cancelEntry">Cancel</button>
                        <button class="save-btn" id="saveEntry">Save Entry</button>
                    </div>
                </div>
                
                <div class="journal-entries" id="journalEntries"></div>
            </div>
        `;
    },
    
    attachEvents(container) {
        const newBtn = container.querySelector('#newEntryBtn');
        const form = container.querySelector('#journalForm');
        const cancelBtn = container.querySelector('#cancelEntry');
        const saveBtn = container.querySelector('#saveEntry');
        const stars = container.querySelectorAll('.star');
        
        let selectedRating = 0;
        
        newBtn.addEventListener('click', () => {
            form.style.display = 'block';
            newBtn.style.display = 'none';
        });
        
        cancelBtn.addEventListener('click', () => {
            form.style.display = 'none';
            newBtn.style.display = 'block';
            this.clearForm(container);
        });
        
        stars.forEach(star => {
            star.addEventListener('click', () => {
                selectedRating = parseInt(star.dataset.rating);
                stars.forEach((s, i) => {
                    s.textContent = i < selectedRating ? '★' : '☆';
                    s.classList.toggle('filled', i < selectedRating);
                });
            });
            star.addEventListener('mouseenter', () => {
                const rating = parseInt(star.dataset.rating);
                stars.forEach((s, i) => {
                    s.textContent = i < rating ? '★' : '☆';
                });
            });
            star.addEventListener('mouseleave', () => {
                stars.forEach((s, i) => {
                    s.textContent = i < selectedRating ? '★' : '☆';
                });
            });
        });
        
        saveBtn.addEventListener('click', () => {
            const entry = {
                coffeeName: container.querySelector('#coffeeName').value,
                brewMethod: container.querySelector('#journalBrewMethod').value,
                flavorNotes: container.querySelector('#flavorNotes').value,
                rating: selectedRating,
                notes: container.querySelector('#additionalNotes').value
            };
            
            if (!entry.coffeeName) {
                alert('Please enter a coffee name');
                return;
            }
            
            this.saveEntry(entry);
            this.clearForm(container);
            form.style.display = 'none';
            newBtn.style.display = 'block';
            selectedRating = 0;
            this.renderEntries(container);
        });
    },
    
    clearForm(container) {
        container.querySelector('#coffeeName').value = '';
        container.querySelector('#journalBrewMethod').value = '';
        container.querySelector('#flavorNotes').value = '';
        container.querySelector('#additionalNotes').value = '';
        container.querySelectorAll('.star').forEach(s => {
            s.textContent = '☆';
            s.classList.remove('filled');
        });
    },
    
    renderEntries(container) {
        const entriesDiv = container.querySelector('#journalEntries');
        const entries = this.getEntries();
        
        if (entries.length === 0) {
            entriesDiv.innerHTML = '<p class="no-entries">No tasting notes yet. Start your coffee journal!</p>';
            return;
        }
        
        entriesDiv.innerHTML = entries.map(entry => `
            <div class="journal-entry" data-id="${entry.id}">
                <div class="entry-header">
                    <h4>${entry.coffeeName}</h4>
                    <span class="entry-date">${new Date(entry.date).toLocaleDateString()}</span>
                </div>
                <div class="entry-rating">${'★'.repeat(entry.rating)}${'☆'.repeat(5 - entry.rating)}</div>
                ${entry.brewMethod ? `<div class="entry-method">☕ ${entry.brewMethod}</div>` : ''}
                ${entry.flavorNotes ? `<div class="entry-flavors">🍃 ${entry.flavorNotes}</div>` : ''}
                ${entry.notes ? `<div class="entry-notes">${entry.notes}</div>` : ''}
                <button class="delete-entry-btn" data-id="${entry.id}">Delete</button>
            </div>
        `).join('');
        
        entriesDiv.querySelectorAll('.delete-entry-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (confirm('Delete this entry?')) {
                    this.deleteEntry(parseInt(e.target.dataset.id));
                    this.renderEntries(container);
                }
            });
        });
    }
};

// =========================================================
// FEATURE 6: CAFFEINE INTAKE TRACKER
// Track daily caffeine consumption
// =========================================================
const CaffeineTracker = {
    // Caffeine content in mg
    caffeineContent: {
        'espresso': 63,
        'drip-8oz': 95,
        'drip-12oz': 142,
        'pour-over': 120,
        'french-press': 107,
        'cold-brew-8oz': 200,
        'cold-brew-can': 150,
        'aeropress': 110,
        'nitro': 215,
        'decaf': 3
    },
    
    maxDaily: 400, // FDA recommended max
    
    getTodayIntake() {
        const today = new Date().toDateString();
        const data = localStorage.getItem('caffeineTracker');
        const tracker = data ? JSON.parse(data) : {};
        return tracker[today] || { cups: [], total: 0 };
    },
    
    addCup(type) {
        const today = new Date().toDateString();
        const data = localStorage.getItem('caffeineTracker');
        const tracker = data ? JSON.parse(data) : {};
        
        if (!tracker[today]) {
            tracker[today] = { cups: [], total: 0 };
        }
        
        const caffeine = this.caffeineContent[type] || 100;
        tracker[today].cups.push({
            type,
            caffeine,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        tracker[today].total += caffeine;
        
        localStorage.setItem('caffeineTracker', JSON.stringify(tracker));
        return tracker[today];
    },
    
    removeLast() {
        const today = new Date().toDateString();
        const data = localStorage.getItem('caffeineTracker');
        const tracker = data ? JSON.parse(data) : {};
        
        if (tracker[today] && tracker[today].cups.length > 0) {
            const removed = tracker[today].cups.pop();
            tracker[today].total -= removed.caffeine;
            localStorage.setItem('caffeineTracker', JSON.stringify(tracker));
        }
        
        return this.getTodayIntake();
    },
    
    init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = this.render();
        this.attachEvents(container);
        this.updateDisplay(container);
    },
    
    render() {
        return `
            <div class="caffeine-container">
                <h3 class="caffeine-title">☕ Daily Caffeine Tracker</h3>
                <p class="caffeine-subtitle">Monitor your daily intake (Max: ${this.maxDaily}mg)</p>
                
                <div class="caffeine-meter">
                    <div class="meter-circle">
                        <svg viewBox="0 0 100 100" class="meter-svg">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="#e0d5c5" stroke-width="8"/>
                            <circle cx="50" cy="50" r="45" fill="none" stroke="#4CAF50" stroke-width="8" 
                                stroke-dasharray="283" stroke-dashoffset="283" stroke-linecap="round"
                                transform="rotate(-90 50 50)" class="meter-progress"/>
                        </svg>
                        <div class="meter-center">
                            <span class="current-mg" id="currentMg">0</span>
                            <span class="mg-label">mg</span>
                        </div>
                    </div>
                    <div class="meter-status" id="meterStatus">Ready for coffee!</div>
                </div>
                
                <div class="add-drink">
                    <p class="add-label">Log a drink:</p>
                    <div class="drink-buttons">
                        <button class="drink-btn" data-type="espresso">
                            <span class="drink-icon">☕</span>
                            <span class="drink-name">Espresso</span>
                            <span class="drink-mg">63mg</span>
                        </button>
                        <button class="drink-btn" data-type="drip-12oz">
                            <span class="drink-icon">🫖</span>
                            <span class="drink-name">Drip (12oz)</span>
                            <span class="drink-mg">142mg</span>
                        </button>
                        <button class="drink-btn" data-type="pour-over">
                            <span class="drink-icon">🧪</span>
                            <span class="drink-name">Pour Over</span>
                            <span class="drink-mg">120mg</span>
                        </button>
                        <button class="drink-btn" data-type="cold-brew-8oz">
                            <span class="drink-icon">🧊</span>
                            <span class="drink-name">Cold Brew</span>
                            <span class="drink-mg">200mg</span>
                        </button>
                        <button class="drink-btn" data-type="aeropress">
                            <span class="drink-icon">🔻</span>
                            <span class="drink-name">AeroPress</span>
                            <span class="drink-mg">110mg</span>
                        </button>
                        <button class="drink-btn" data-type="decaf">
                            <span class="drink-icon">😴</span>
                            <span class="drink-name">Decaf</span>
                            <span class="drink-mg">3mg</span>
                        </button>
                    </div>
                </div>
                
                <div class="today-log" id="todayLog">
                    <h4>Today's Log</h4>
                    <div class="log-entries" id="logEntries"></div>
                </div>
                
                <button class="undo-btn" id="undoBtn">↩ Undo Last</button>
            </div>
        `;
    },
    
    attachEvents(container) {
        container.querySelectorAll('.drink-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.addCup(btn.dataset.type);
                this.updateDisplay(container);
                btn.classList.add('added');
                setTimeout(() => btn.classList.remove('added'), 300);
            });
        });
        
        container.querySelector('#undoBtn').addEventListener('click', () => {
            this.removeLast();
            this.updateDisplay(container);
        });
    },
    
    updateDisplay(container) {
        const intake = this.getTodayIntake();
        const percent = Math.min(100, (intake.total / this.maxDaily) * 100);
        
        // Update circle
        const progress = container.querySelector('.meter-progress');
        const circumference = 283;
        const offset = circumference - (percent / 100) * circumference;
        progress.style.strokeDashoffset = offset;
        
        // Update color based on intake
        if (percent < 50) {
            progress.style.stroke = '#4CAF50';
        } else if (percent < 75) {
            progress.style.stroke = '#c9a96e';
        } else if (percent < 100) {
            progress.style.stroke = '#E07B39';
        } else {
            progress.style.stroke = '#E74C3C';
        }
        
        // Update text
        container.querySelector('#currentMg').textContent = intake.total;
        
        // Update status
        const status = container.querySelector('#meterStatus');
        if (intake.total === 0) {
            status.textContent = 'Ready for coffee!';
        } else if (intake.total < 200) {
            status.textContent = 'Feeling good ✨';
        } else if (intake.total < 300) {
            status.textContent = 'Nicely caffeinated ☕';
        } else if (intake.total < 400) {
            status.textContent = 'Getting energized ⚡';
        } else {
            status.textContent = 'Recommended limit reached! ⚠️';
        }
        
        // Update log
        const logEntries = container.querySelector('#logEntries');
        if (intake.cups.length === 0) {
            logEntries.innerHTML = '<p class="no-cups">No drinks logged yet today</p>';
        } else {
            logEntries.innerHTML = intake.cups.map((cup, i) => `
                <div class="log-entry">
                    <span class="log-time">${cup.time}</span>
                    <span class="log-type">${this.formatDrinkName(cup.type)}</span>
                    <span class="log-caffeine">+${cup.caffeine}mg</span>
                </div>
            `).join('');
        }
    },
    
    formatDrinkName(type) {
        const names = {
            'espresso': 'Espresso Shot',
            'drip-8oz': 'Drip Coffee (8oz)',
            'drip-12oz': 'Drip Coffee (12oz)',
            'pour-over': 'Pour Over',
            'french-press': 'French Press',
            'cold-brew-8oz': 'Cold Brew',
            'cold-brew-can': 'Cold Brew Can',
            'aeropress': 'AeroPress',
            'nitro': 'Nitro Cold Brew',
            'decaf': 'Decaf'
        };
        return names[type] || type;
    }
};

// Initialize all features when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Features are initialized individually in the HTML where their containers exist
});

// Export for external use
if (typeof window !== 'undefined') {
    window.FlavorWheel = FlavorWheel;
    window.CoffeePairing = CoffeePairing;
    window.FreshnessTimer = FreshnessTimer;
    window.BrewCalculator = BrewCalculator;
    window.TastingJournal = TastingJournal;
    window.CaffeineTracker = CaffeineTracker;
}

