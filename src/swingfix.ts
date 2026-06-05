export interface SwingAnalysis {
  id?: number;
  created_at?: string;
  overall_score: number;
  swing_plane?: string;
  tempo?: string;
  hip_rotation?: string;
  head_position?: string;
  impact_position?: string;
  follow_through?: string;
  flaws: string[];
  strengths: string[];
  summary: string;
  top_drill?: string;
}

export class SwingFixClient {
  private supabaseUrl: string;
  private anonKey: string;

  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL ?? "";
    this.anonKey = process.env.SUPABASE_ANON_KEY ?? "";
    if (!this.anonKey) throw new Error("SUPABASE_ANON_KEY is required");
    if (!this.supabaseUrl) throw new Error("SUPABASE_URL is required");
  }

  async analyzeSwing(imageUrl: string, userId: string, clubType?: string): Promise<SwingAnalysis> {
    const res = await fetch(`${this.supabaseUrl}/functions/v1/smooth-action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.anonKey}`,
      },
      body: JSON.stringify({ image_url: imageUrl, user_id: userId, club_type: clubType }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Analysis failed: ${res.status} ${err}`);
    }
    return res.json();
  }

  async getHistory(userId: string, limit = 10): Promise<SwingAnalysis[]> {
    const res = await fetch(
      `${this.supabaseUrl}/rest/v1/analyses?user_id=eq.${encodeURIComponent(userId)}&limit=${limit}&order=created_at.desc`,
      {
        headers: {
          Authorization: `Bearer ${this.anonKey}`,
          apikey: this.anonKey,
        },
      }
    );
    if (!res.ok) throw new Error(`History fetch failed: ${res.status}`);
    const rows: Array<{ analysis_json: string; id: number; created_at: string }> = await res.json();
    return rows.map((row) => ({ ...JSON.parse(row.analysis_json), id: row.id, created_at: row.created_at }));
  }
}
