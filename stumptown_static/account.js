// Grainhouse Coffee - Account & Rewards System

const GrainhouseAccount = {
    // Points earning rates
    POINTS_PER_DOLLAR: 10,
    SIGNUP_BONUS: 150,
    
    // Reward tiers
    TIERS: {
        BRONZE: { name: 'Bronze', minPoints: 0, multiplier: 1, color: '#cd7f32' },
        SILVER: { name: 'Silver', minPoints: 500, multiplier: 1.25, color: '#c0c0c0' },
        GOLD: { name: 'Gold', minPoints: 1500, multiplier: 1.5, color: '#c9a96e' },
        PLATINUM: { name: 'Platinum', minPoints: 3000, multiplier: 2, color: '#e5e4e2' }
    },
    
    // Available rewards
    REWARDS: [
        { id: 'free-shipping', name: 'Free Shipping', points: 200, description: 'Free shipping on your next order' },
        { id: 'discount-10', name: '$10 Off', points: 500, description: '$10 off any order over $30' },
        { id: 'discount-20', name: '$20 Off', points: 900, description: '$20 off any order over $50' },
        { id: 'free-bag', name: 'Free 12oz Bag', points: 1500, description: 'Any 12oz bag of coffee, on us' },
        { id: 'discount-50', name: '$50 Off', points: 2500, description: '$50 off any order over $100' }
    ],

    // Initialize the account system
    init() {
        this.updateNavUI();
        this.setupSnipcartIntegration();
    },

    // Get current user from localStorage
    getCurrentUser() {
        const userData = localStorage.getItem('grainhouse_user');
        return userData ? JSON.parse(userData) : null;
    },

    // Save user to localStorage
    saveUser(user) {
        localStorage.setItem('grainhouse_user', JSON.stringify(user));
        this.updateNavUI();
    },

    // Sign up new user
    signup(email, password, firstName, lastName) {
        // Check if user already exists
        const existingUsers = this.getAllUsers();
        if (existingUsers.find(u => u.email === email)) {
            return { success: false, message: 'An account with this email already exists.' };
        }

        const newUser = {
            id: Date.now().toString(),
            email,
            password: this.hashPassword(password),
            firstName,
            lastName,
            points: this.SIGNUP_BONUS,
            totalPointsEarned: this.SIGNUP_BONUS,
            totalSpent: 0,
            orderCount: 0,
            redeemedRewards: [],
            createdAt: new Date().toISOString(),
            pointsHistory: [
                {
                    type: 'earned',
                    amount: this.SIGNUP_BONUS,
                    description: 'Welcome bonus',
                    date: new Date().toISOString()
                }
            ]
        };

        // Save to users list
        existingUsers.push(newUser);
        localStorage.setItem('grainhouse_users', JSON.stringify(existingUsers));
        
        // Set as current user
        this.saveUser(newUser);

        return { success: true, message: 'Account created! You earned ' + this.SIGNUP_BONUS + ' bonus points!', user: newUser };
    },

    // Login user
    login(email, password) {
        const users = this.getAllUsers();
        const user = users.find(u => u.email === email && u.password === this.hashPassword(password));
        
        if (user) {
            this.saveUser(user);
            return { success: true, message: 'Welcome back, ' + user.firstName + '!', user };
        }
        
        return { success: false, message: 'Invalid email or password.' };
    },

    // Logout user
    logout() {
        localStorage.removeItem('grainhouse_user');
        this.updateNavUI();
        window.location.href = 'account.html';
    },

    // Get all users
    getAllUsers() {
        const users = localStorage.getItem('grainhouse_users');
        return users ? JSON.parse(users) : [];
    },

    // Simple hash function (for demo - use proper hashing in production)
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    },

    // Get user's current tier
    getUserTier(user) {
        if (!user) return this.TIERS.BRONZE;
        
        const points = user.totalPointsEarned || 0;
        
        if (points >= this.TIERS.PLATINUM.minPoints) return this.TIERS.PLATINUM;
        if (points >= this.TIERS.GOLD.minPoints) return this.TIERS.GOLD;
        if (points >= this.TIERS.SILVER.minPoints) return this.TIERS.SILVER;
        return this.TIERS.BRONZE;
    },

    // Get points to next tier
    getPointsToNextTier(user) {
        if (!user) return this.TIERS.SILVER.minPoints;
        
        const currentTier = this.getUserTier(user);
        const points = user.totalPointsEarned || 0;
        
        if (currentTier === this.TIERS.PLATINUM) return 0;
        if (currentTier === this.TIERS.GOLD) return this.TIERS.PLATINUM.minPoints - points;
        if (currentTier === this.TIERS.SILVER) return this.TIERS.GOLD.minPoints - points;
        return this.TIERS.SILVER.minPoints - points;
    },

    // Add points to user
    addPoints(amount, description) {
        const user = this.getCurrentUser();
        if (!user) return false;

        const tier = this.getUserTier(user);
        const earnedPoints = Math.floor(amount * tier.multiplier);
        
        user.points += earnedPoints;
        user.totalPointsEarned += earnedPoints;
        user.pointsHistory.unshift({
            type: 'earned',
            amount: earnedPoints,
            description,
            date: new Date().toISOString()
        });

        this.saveUser(user);
        this.syncUserToList(user);
        
        return earnedPoints;
    },

    // Record a purchase
    recordPurchase(orderTotal) {
        const user = this.getCurrentUser();
        if (!user) return false;

        const basePoints = Math.floor(orderTotal * this.POINTS_PER_DOLLAR);
        const tier = this.getUserTier(user);
        const earnedPoints = Math.floor(basePoints * tier.multiplier);
        
        user.points += earnedPoints;
        user.totalPointsEarned += earnedPoints;
        user.totalSpent += orderTotal;
        user.orderCount += 1;
        user.pointsHistory.unshift({
            type: 'earned',
            amount: earnedPoints,
            description: `Purchase - $${orderTotal.toFixed(2)}`,
            date: new Date().toISOString()
        });

        this.saveUser(user);
        this.syncUserToList(user);
        
        return earnedPoints;
    },

    // Redeem a reward
    redeemReward(rewardId) {
        const user = this.getCurrentUser();
        if (!user) return { success: false, message: 'Please log in to redeem rewards.' };

        const reward = this.REWARDS.find(r => r.id === rewardId);
        if (!reward) return { success: false, message: 'Reward not found.' };

        if (user.points < reward.points) {
            return { success: false, message: 'Not enough points for this reward.' };
        }

        // Deduct points
        user.points -= reward.points;
        
        // Generate reward code
        const rewardCode = this.generateRewardCode(reward);
        
        user.redeemedRewards.unshift({
            ...reward,
            code: rewardCode,
            redeemedAt: new Date().toISOString(),
            used: false
        });
        
        user.pointsHistory.unshift({
            type: 'redeemed',
            amount: -reward.points,
            description: `Redeemed: ${reward.name}`,
            date: new Date().toISOString()
        });

        this.saveUser(user);
        this.syncUserToList(user);

        return { success: true, message: `Reward redeemed! Your code: ${rewardCode}`, code: rewardCode };
    },

    // Generate reward code
    generateRewardCode(reward) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = 'GH';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    },

    // Sync user to users list
    syncUserToList(user) {
        const users = this.getAllUsers();
        const index = users.findIndex(u => u.id === user.id);
        if (index !== -1) {
            users[index] = user;
            localStorage.setItem('grainhouse_users', JSON.stringify(users));
        }
    },

    // Update navigation UI based on login state
    updateNavUI() {
        const user = this.getCurrentUser();
        const navRight = document.querySelector('.nav-right');
        const mobileNavLinks = document.querySelector('.mobile-nav-links');
        
        if (!navRight) return;

        // Check if account button already exists
        let accountBtn = navRight.querySelector('.account-btn');
        
        if (user) {
            // User is logged in
            if (!accountBtn) {
                accountBtn = document.createElement('a');
                accountBtn.className = 'account-btn';
                accountBtn.href = 'rewards.html';
                navRight.insertBefore(accountBtn, navRight.firstChild);
            }
            
            const tier = this.getUserTier(user);
            accountBtn.innerHTML = `
                <span class="account-icon">👤</span>
                <span class="account-points" style="color: ${tier.color}">${user.points.toLocaleString()} pts</span>
            `;
            accountBtn.title = `${user.firstName} - ${tier.name} Member`;
            
            // Update mobile nav
            if (mobileNavLinks) {
                let mobileAccountLink = mobileNavLinks.querySelector('.mobile-account-link');
                if (!mobileAccountLink) {
                    mobileAccountLink = document.createElement('li');
                    mobileAccountLink.className = 'mobile-account-link';
                    mobileNavLinks.appendChild(mobileAccountLink);
                }
                mobileAccountLink.innerHTML = `<a href="rewards.html">My Rewards (${user.points.toLocaleString()} pts)</a>`;
            }
        } else {
            // User is not logged in
            if (!accountBtn) {
                accountBtn = document.createElement('a');
                accountBtn.className = 'account-btn';
                accountBtn.href = 'account.html';
                navRight.insertBefore(accountBtn, navRight.firstChild);
            }
            accountBtn.innerHTML = `<span class="account-icon">👤</span><span>Sign In</span>`;
            accountBtn.title = 'Sign in or create account';
            
            // Update mobile nav
            if (mobileNavLinks) {
                let mobileAccountLink = mobileNavLinks.querySelector('.mobile-account-link');
                if (!mobileAccountLink) {
                    mobileAccountLink = document.createElement('li');
                    mobileAccountLink.className = 'mobile-account-link';
                    mobileNavLinks.appendChild(mobileAccountLink);
                }
                mobileAccountLink.innerHTML = `<a href="account.html">Sign In / Join</a>`;
            }
        }
    },

    // Setup Snipcart integration for points earning
    setupSnipcartIntegration() {
        // Listen for Snipcart order completion
        document.addEventListener('snipcart.ready', () => {
            Snipcart.events.on('order.completed', (order) => {
                const user = this.getCurrentUser();
                if (user && order && order.total) {
                    const earnedPoints = this.recordPurchase(order.total);
                    if (earnedPoints) {
                        this.showPointsNotification(earnedPoints);
                    }
                }
            });
        });
    },

    // Show points earned notification
    showPointsNotification(points) {
        const notification = document.createElement('div');
        notification.className = 'points-notification';
        notification.innerHTML = `
            <div class="points-notification-content">
                <span class="points-icon">🎉</span>
                <span>You earned <strong>${points}</strong> points!</span>
            </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    },

    // Format date for display
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    GrainhouseAccount.init();
});

