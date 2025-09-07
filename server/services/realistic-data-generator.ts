/**
 * Realistic Data Generator for Social Media Account Creation
 * Generates believable usernames, passwords, names, and profile data
 */

export interface GeneratedAccountData {
  username: string;
  password: string;
  fullName: string;
  firstName: string;
  lastName: string;
  bio: string;
  dateOfBirth: {
    month: string;
    day: string;
    year: string;
  };
  gender: 'male' | 'female' | 'other';
  interests: string[];
  location: string;
  phoneCountryCode: string;
}

class RealisticDataGenerator {
  private japaneseNames = {
    male: {
      first: ['Hiroshi', 'Takeshi', 'Kenji', 'Yuki', 'Satoshi', 'Akira', 'Ryouta', 'Daichi', 'Hiro', 'Kazuki', 'Sho', 'Ren', 'Kenta', 'Yuta', 'Ryo'],
      last: ['Tanaka', 'Suzuki', 'Takahashi', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Sato', 'Sasaki', 'Yamaguchi', 'Matsumoto', 'Inoue', 'Kimura', 'Hayashi']
    },
    female: {
      first: ['Yuki', 'Ai', 'Emi', 'Rei', 'Mika', 'Nana', 'Saki', 'Yui', 'Kana', 'Rina', 'Mei', 'Ami', 'Rio', 'Hana', 'Kira'],
      last: ['Tanaka', 'Suzuki', 'Takahashi', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Sato', 'Sasaki', 'Yamaguchi', 'Matsumoto', 'Inoue', 'Kimura', 'Hayashi']
    }
  };

  private westernNames = {
    male: {
      first: ['Alex', 'David', 'Michael', 'James', 'John', 'Chris', 'Matt', 'Ryan', 'Jake', 'Luke', 'Max', 'Ben', 'Sam', 'Tom', 'Dan'],
      last: ['Smith', 'Johnson', 'Brown', 'Taylor', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson', 'Martinez', 'Anderson', 'Thomas', 'Hernandez', 'Moore', 'Martin']
    },
    female: {
      first: ['Emma', 'Olivia', 'Ava', 'Isabella', 'Sophia', 'Mia', 'Charlotte', 'Amelia', 'Harper', 'Evelyn', 'Abigail', 'Emily', 'Elizabeth', 'Sofia', 'Avery'],
      last: ['Smith', 'Johnson', 'Brown', 'Taylor', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson', 'Martinez', 'Anderson', 'Thomas', 'Hernandez', 'Moore', 'Martin']
    }
  };

  private usernamePrefixes = [
    'cool', 'awesome', 'happy', 'fun', 'real', 'official', 'best', 'super', 'pro', 'elite', 
    'daily', 'life', 'style', 'vibe', 'mood', 'japan', 'tokyo', 'kawaii', 'otaku', 'gaming',
    'music', 'artist', 'creator', 'travel', 'photo', 'food', 'fitness', 'tech', 'anime', 'manga'
  ];

  private usernameSuffixes = [
    '2025', '24', '23', 'official', 'real', 'jp', 'tokyo', 'osaka', 'life', 'style',
    'vibe', 'mood', 'fan', 'lover', 'daily', 'gram', 'tok', 'pro', 'star', 'king',
    'queen', 'master', 'god', 'legend', 'hero', 'ninja', 'samurai', '777', '999', '123'
  ];

  private interests = [
    'anime', 'manga', 'gaming', 'music', 'travel', 'food', 'photography', 'fashion', 
    'technology', 'sports', 'fitness', 'art', 'movies', 'books', 'cooking', 'dancing',
    'karaoke', 'shopping', 'nature', 'cats', 'dogs', 'coffee', 'ramen', 'sushi', 'jpop',
    'cosplay', 'streaming', 'vlogging', 'basketball', 'soccer', 'tennis', 'skiing'
  ];

  private japaneseLocations = [
    'Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Nagoya', 'Sapporo', 'Fukuoka', 'Hiroshima',
    'Sendai', 'Chiba', 'Sakai', 'Niigata', 'Hamamatsu', 'Kumamoto', 'Sagamihara'
  ];

  private bioTemplates = [
    '🌸 Living my best life in {location} ✨',
    '📸 Creator | {interest} lover | DM for collabs 💫',
    '🎮 Gamer | {interest} enthusiast | Follow for daily vibes ⚡',
    '🍜 {location} based | Love {interest} & {interest2} | 日本語/English OK 🌟',
    '✨ Just vibing | {interest} addict | Let\'s be friends! 🎵',
    '🌈 {interest} × {interest2} = happiness | {location} life 🗾',
    '📱 Content creator | {interest} daily | Follow my journey! 🚀',
    '🎨 Creative soul | {interest} & {interest2} | Always learning 📚',
    '🌸 {location} girl/guy | {interest} is life | Spread positivity ✨',
    '🎯 Goals: Travel more | Love {interest} | DM me! 💌'
  ];

  /**
   * Generate a realistic username based on name and interests
   */
  generateUsername(firstName: string, lastName: string, addRandomness: boolean = true): string {
    const baseOptions = [
      // Name based
      `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
      `${firstName.toLowerCase()}_${lastName.toLowerCase()}`,
      `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
      `${firstName.toLowerCase()}${lastName.slice(0, 1).toLowerCase()}`,
      `${firstName.slice(0, 1).toLowerCase()}${lastName.toLowerCase()}`,
      
      // Creative combinations
      `${this.randomChoice(this.usernamePrefixes)}_${firstName.toLowerCase()}`,
      `${firstName.toLowerCase()}_${this.randomChoice(this.usernameSuffixes)}`,
      `${this.randomChoice(this.usernamePrefixes)}${firstName.toLowerCase()}${this.randomChoice(this.usernameSuffixes)}`,
      `${firstName.toLowerCase()}${this.randomChoice(this.usernameSuffixes)}`,
      `real_${firstName.toLowerCase()}${lastName.slice(0, 1).toLowerCase()}`,
    ];

    let username = this.randomChoice(baseOptions);

    // Add randomness if requested
    if (addRandomness && Math.random() > 0.6) {
      const randomNum = Math.floor(Math.random() * 9999);
      username += randomNum.toString();
    }

    // Ensure it's not too long (most platforms have limits)
    if (username.length > 30) {
      username = username.slice(0, 30);
    }

    return username;
  }

  /**
   * Generate a strong but memorable password
   */
  generatePassword(): string {
    const adjectives = ['Cool', 'Super', 'Happy', 'Lucky', 'Smart', 'Fast', 'Strong', 'Bright', 'Wild', 'Free'];
    const nouns = ['Cat', 'Dog', 'Lion', 'Tiger', 'Eagle', 'Star', 'Moon', 'Sun', 'Wave', 'Fire'];
    const numbers = Math.floor(Math.random() * 9999) + 1000;
    const symbols = ['!', '@', '#', '$', '%'];
    
    const adjective = this.randomChoice(adjectives);
    const noun = this.randomChoice(nouns);
    const symbol = this.randomChoice(symbols);
    
    return `${adjective}${noun}${numbers}${symbol}`;
  }

  /**
   * Generate realistic date of birth (18-35 years old)
   */
  generateDateOfBirth(): { month: string; day: string; year: string } {
    const currentYear = new Date().getFullYear();
    const age = Math.floor(Math.random() * 18) + 18; // 18-35 years old
    const year = currentYear - age;
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1; // Safe day range for all months
    
    return {
      month: month.toString().padStart(2, '0'),
      day: day.toString().padStart(2, '0'),
      year: year.toString()
    };
  }

  /**
   * Generate a bio based on interests and location
   */
  generateBio(interests: string[], location: string, gender: string): string {
    let template = this.randomChoice(this.bioTemplates);
    
    template = template.replace('{location}', location);
    template = template.replace('{interest}', this.randomChoice(interests));
    template = template.replace('{interest2}', this.randomChoice(interests.filter(i => i !== interests[0])));
    template = template.replace('girl/guy', gender === 'female' ? 'girl' : 'guy');
    
    return template;
  }

  /**
   * Generate complete realistic account data
   */
  generateAccountData(): GeneratedAccountData {
    // Choose culture mix (70% Japanese influenced, 30% Western)
    const isJapaneseInfluenced = Math.random() < 0.7;
    const gender = this.randomChoice(['male', 'female', 'other']);
    
    let firstName: string;
    let lastName: string;
    
    if (isJapaneseInfluenced && gender !== 'other') {
      firstName = this.randomChoice(this.japaneseNames[gender as 'male' | 'female'].first);
      lastName = this.randomChoice(this.japaneseNames[gender as 'male' | 'female'].last);
    } else {
      firstName = this.randomChoice(this.westernNames[gender === 'female' ? 'female' : 'male'].first);
      lastName = this.randomChoice(this.westernNames[gender === 'female' ? 'female' : 'male'].last);
    }

    const fullName = `${firstName} ${lastName}`;
    const username = this.generateUsername(firstName, lastName);
    const password = this.generatePassword();
    const dateOfBirth = this.generateDateOfBirth();
    const location = this.randomChoice(this.japaneseLocations);
    const selectedInterests = this.randomChoices(this.interests, Math.floor(Math.random() * 4) + 2);
    const bio = this.generateBio(selectedInterests, location, gender);

    return {
      username,
      password,
      fullName,
      firstName,
      lastName,
      bio,
      dateOfBirth,
      gender: gender as 'male' | 'female' | 'other',
      interests: selectedInterests,
      location,
      phoneCountryCode: '+81' // Japan country code
    };
  }

  /**
   * Generate multiple account data sets
   */
  generateMultipleAccounts(count: number): GeneratedAccountData[] {
    const accounts: GeneratedAccountData[] = [];
    const usedUsernames = new Set<string>();

    for (let i = 0; i < count; i++) {
      let accountData = this.generateAccountData();
      
      // Ensure unique usernames
      let attempts = 0;
      while (usedUsernames.has(accountData.username) && attempts < 10) {
        accountData = this.generateAccountData();
        attempts++;
      }
      
      if (!usedUsernames.has(accountData.username)) {
        usedUsernames.add(accountData.username);
        accounts.push(accountData);
      }
    }

    return accounts;
  }

  private randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private randomChoices<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
}

export const realisticDataGenerator = new RealisticDataGenerator();