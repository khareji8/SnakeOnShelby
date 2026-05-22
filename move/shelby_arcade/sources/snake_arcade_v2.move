module shelby_arcade::snake_arcade_v2 {
    use std::signer;
    use std::vector;
    use aptos_framework::coin;
    use aptos_framework::timestamp;
    
    // Errors
    const E_COOLDOWN_ACTIVE: u64 = 1;
    const E_NOT_AUTHORIZED: u64 = 2;
    const E_TREASURY_NOT_SET: u64 = 3;

    // Constants
    const GAME_COST: u64 = 100000;
    const CHECK_IN_POINTS: u64 = 10;

    struct LeaderboardRecord has store, drop, copy {
        player: address,
        score: u64,
        timestamp: u64,
    }

    struct GlobalLeaderboards has key {
        top_scores: vector<LeaderboardRecord>,
        top_streaks: vector<LeaderboardRecord>,
        top_active: vector<LeaderboardRecord>,
    }

    struct PlayerStats has key {
        bonus_points: u64,
        high_score: u64,
        last_check_in: u64,
        games_played: u64,
    }

    struct TreasuryConfig has key {
        treasury_address: address,
    }

    // Initialize the module state
    fun init_module(admin: &signer) {
        move_to(admin, GlobalLeaderboards {
            top_scores: vector::empty<LeaderboardRecord>(),
            top_streaks: vector::empty<LeaderboardRecord>(),
            top_active: vector::empty<LeaderboardRecord>(),
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

    fun ensure_player_stats(player: &signer) {
        let player_addr = signer::address_of(player);
        if (!exists<PlayerStats>(player_addr)) {
            move_to(player, PlayerStats {
                bonus_points: 0,
                high_score: 0,
                last_check_in: 0,
                games_played: 0,
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

    // Helper to sort and truncate a leaderboard
    fun update_leaderboard_list(records: &mut vector<LeaderboardRecord>, new_record: LeaderboardRecord) {
        // Check if player already exists in the top 50
        let len = vector::length(records);
        let i = 0;
        let found = false;
        while (i < len) {
            let r = vector::borrow_mut(records, i);
            if (r.player == new_record.player) {
                if (new_record.score > r.score) {
                    r.score = new_record.score;
                    r.timestamp = new_record.timestamp;
                };
                found = true;
                break;
            };
            i = i + 1;
        };

        if (!found) {
            vector::push_back(records, new_record);
        };

        // Sort
        let len_new = vector::length(records);
        let k = 0;
        while (k < len_new - 1) {
            let j = 0;
            while (j < len_new - k - 1) {
                let r1 = vector::borrow(records, j);
                let r2 = vector::borrow(records, j + 1);
                if (r1.score < r2.score) {
                    vector::swap(records, j, j + 1);
                };
                j = j + 1;
            };
            k = k + 1;
        };

        // Truncate to top 50
        if (vector::length(records) > 50) {
            vector::pop_back(records);
        };
    }

    // Submit a score
    public entry fun submit_score<CoinType>(player: &signer, score: u64) acquires TreasuryConfig, PlayerStats, GlobalLeaderboards {
        pay_fee<CoinType>(player);
        ensure_player_stats(player);
        
        let player_addr = signer::address_of(player);
        let stats = borrow_global_mut<PlayerStats>(player_addr);
        
        stats.games_played = stats.games_played + 1;
        if (score > stats.high_score) {
            stats.high_score = score;
        };

        // Update global leaderboards
        let leaderboards = borrow_global_mut<GlobalLeaderboards>(@shelby_arcade);
        let now = timestamp::now_seconds();
        
        // Update Top Scores
        update_leaderboard_list(&mut leaderboards.top_scores, LeaderboardRecord {
            player: player_addr,
            score: stats.high_score,
            timestamp: now,
        });

        // Update Top Active (Games Played)
        update_leaderboard_list(&mut leaderboards.top_active, LeaderboardRecord {
            player: player_addr,
            score: stats.games_played,
            timestamp: now,
        });
    }

    // Daily check-in
    public entry fun daily_check_in<CoinType>(player: &signer) acquires TreasuryConfig, PlayerStats, GlobalLeaderboards {
        ensure_player_stats(player);
        
        let player_addr = signer::address_of(player);
        let stats = borrow_global_mut<PlayerStats>(player_addr);
        
        let now = timestamp::now_seconds();
        let cooldown_period = 24 * 60 * 60; // 24 hours in seconds
        
        assert!(now >= stats.last_check_in + cooldown_period, E_COOLDOWN_ACTIVE);
        
        pay_fee<CoinType>(player);
        
        stats.last_check_in = now;
        stats.bonus_points = stats.bonus_points + CHECK_IN_POINTS;

        // Update Top Streaks (Bonus Points)
        let leaderboards = borrow_global_mut<GlobalLeaderboards>(@shelby_arcade);
        update_leaderboard_list(&mut leaderboards.top_streaks, LeaderboardRecord {
            player: player_addr,
            score: stats.bonus_points,
            timestamp: now,
        });
    }
}
