module seq101 (
  input clk,
  input rst,
  input din,
  output reg hit
);
  localparam S0 = 2'd0, S1 = 2'd1, S2 = 2'd2, S3 = 2'd3;
  reg [1:0] state, next_state;

  always @(posedge clk) begin
    if (rst) state <= S0;
    else state <= next_state;
  end

  always @(*) begin
    next_state = state;
    hit = 1'b0;
    case (state)
      S0: next_state = din ? S1 : S0;
      S1: next_state = din ? S1 : S2;
      // TODO: S2 means we have seen 1 then 0. A 1 moves to S3. A 0 returns to S0.
      S2: next_state = S2;
      S3: begin
        hit = 1'b1;
        next_state = din ? S1 : S2;
      end
      default: next_state = S0;
    endcase
  end
endmodule
