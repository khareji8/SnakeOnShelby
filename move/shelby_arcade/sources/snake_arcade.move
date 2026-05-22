module shelby_arcade::snake_arcade {
    use std::signer;
    use std::vector;
    use aptos_framework::coin;
    use aptos_framework::timestamp;
    
    // Errors
    const E_COOLDOWN_ACTIVE: u64 = 1;
    const E_NOT_AUTHORIZED: u64 = 2;
    const E_TREASURY_NOT_SET: u64 = 3;

    // Constants
    const GAME_COST: u64 = 100000; // Assuming 8 decimals for custom coin: 0.001 * 10^8
    const CHECK_IN_POINTS: u64 = 10;

    struct LeaderboardRecord has store, drop, copy {
        player: address,
        score: u64,
        timestamp: u64,
    }

    struct GlobalLeaderboard has key {
        records: vector<LeaderboardRecord>,
    }

    struct PlayerStats has key {
        bonus_points: u64,
        high_score: u64,
        last_check_in: u64,
    }

    struct TreasuryConfig has key {
        treasury_address: address,
    }

    // Initialize the module state (called once when deploying)
    fun init_module(admin: &signer) {
        move_to(admin, GlobalLeaderboard {
            records: vector::empty<LeaderboardRecord>(),
        });
        move_to(admin, TreasuryConfig {
            treasury_address: signer::address_of(admin),
        });
    }

    // Set a new treasury address
    public entry fun set_treasury(admin: &signer, new_treasury: address) acquires TreasuryConfig {
        let admin_addr = signer::address_of(admin);
        // Only the deployer (shelby_arcade address) can call this
        assert!(admin_addr == @shelby_arcade, E_NOT_AUTHORIZED);
        assert!(exists<TreasuryConfig>(admin_addr), E_TREASURY_NOT_SET);
        let config = borrow_global_mut<TreasuryConfig>(admin_addr);
        config.treasury_address = new_treasury;
    }

    // Initialize player stats if they don't exist
    fun ensure_player_stats(player: &signer) {
        let player_addr = signer::address_of(player);
        if (!exists<PlayerStats>(player_addr)) {
            move_to(player, PlayerStats {
                bonus_points: 0,
                high_score: 0,
                last_check_in: 0,
            });
        }
    }

    // Internal helper to pay the fee
    fun pay_fee<CoinType>(player: &signer) acquires TreasuryConfig {
        let config = borrow_global<TreasuryConfig>(@shelby_arcade);
        coin::transfer<CoinType>(player, config.treasury_address, GAME_COST);
    }

    // Pay game entry fee
    public entry fun pay_game_entry<CoinType>(player: &signer) acquires TreasuryConfig {
        pay_fee<CoinType>(player);
    }

    // Submit a score
    public entry fun submit_score<CoinType>(player: &signer, score: u64) acquires TreasuryConfig, PlayerStats, GlobalLeaderboard {
        pay_fee<CoinType>(player);
        ensure_player_stats(player);
        
        let player_addr = signer::address_of(player);
        let stats = borrow_global_mut<PlayerStats>(player_addr);
        
        if (score > stats.high_score) {
            stats.high_score = score;
        };

        // Update global leaderboard
        let leaderboard = borrow_global_mut<GlobalLeaderboard>(@shelby_arcade);
        let now = timestamp::now_seconds();
        let new_record = LeaderboardRecord {
            player: player_addr,
            score: score,
            timestamp: now,
        };
        
        vector::push_back(&mut leaderboard.records, new_record);
        
        // Basic bubble sort for the top 50 (descending)
        let len = vector::length(&leaderboard.records);
        let i = 0;
        while (i < len - 1) {
            let j = 0;
            while (j < len - i - 1) {
                let r1 = vector::borrow(&leaderboard.records, j);
                let r2 = vector::borrow(&leaderboard.records, j + 1);
                if (r1.score < r2.score) {
                    vector::swap(&mut leaderboard.records, j, j + 1);
                };
                j = j + 1;
            };
            i = i + 1;
        };

        // Truncate to top 50
        if (vector::length(&leaderboard.records) > 50) {
            vector::pop_back(&mut leaderboard.records);
        };
    }

    // Daily check-in
    public entry fun daily_check_in<CoinType>(player: &signer) acquires TreasuryConfig, PlayerStats {
        ensure_player_stats(player);
        
        let player_addr = signer::address_of(player);
        let stats = borrow_global_mut<PlayerStats>(player_addr);
        
        let now = timestamp::now_seconds();
        let cooldown_period = 24 * 60 * 60; // 24 hours in seconds
        
        assert!(now >= stats.last_check_in + cooldown_period, E_COOLDOWN_ACTIVE);
        
        pay_fee<CoinType>(player);
        
        stats.last_check_in = now;
        stats.bonus_points = stats.bonus_points + CHECK_IN_POINTS;
    }
}
