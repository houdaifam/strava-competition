export interface BingoCell {
  id: number;
  text: string;
}

export const BINGO_CELLS: BingoCell[] = [
  { id: 1,  text: "Do an activity with someone from another Keyrus team" },
  { id: 2,  text: "Try four different sports" },
  { id: 3,  text: "Try a water-based sport" },
  { id: 4,  text: "Exercise before 9h00" },
  { id: 5,  text: "Catch a sunset during your workout" },
  { id: 6,  text: "Get active during your lunch break" },
  { id: 7,  text: "Have a day where you reached at least 10k steps" },
  { id: 8,  text: "Complete two workouts in one day" },
  { id: 9,  text: "Get a stranger to join your activity" },
  { id: 10, text: "Burn 500+ calories in one session" },
  { id: 11, text: "Do one sport on 2 days in 2 different locations" },
  { id: 12, text: "Do a workout of 60+ minutes" },
  { id: 13, text: "Train in 3 different cities" },
  { id: 14, text: "Use sport as your commute (not just to work)" },
  { id: 15, text: "Play a team sport" },
  { id: 16, text: "Train 3 days in a row" },
];

export const TOTAL_CELLS = BINGO_CELLS.length;
