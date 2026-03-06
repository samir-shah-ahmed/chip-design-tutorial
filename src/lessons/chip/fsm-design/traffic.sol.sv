module traffic(
  input        clk, reset,
  output reg [2:0] light
);
  localparam GREEN = 2'd0, YELLOW = 2'd1, RED = 2'd2;
  reg [1:0] state;
  reg [3:0] timer;

  always @(posedge clk) begin
    if (reset) begin
      state <= GREEN; timer <= 0; light <= 3'b001;
    end else begin
      timer <= timer + 1;
      case (state)
        GREEN: begin
          light <= 3'b001;
          if (timer == 4'd9) begin state <= YELLOW; timer <= 0; end
        end
        YELLOW: begin
          light <= 3'b010;
          if (timer == 4'd2) begin state <= RED; timer <= 0; end
        end
        RED: begin
          light <= 3'b100;
          if (timer == 4'd9) begin state <= GREEN; timer <= 0; end
        end
        default: begin state <= GREEN; timer <= 0; end
      endcase
    end
  end
endmodule
