module traffic(
  input        clk, reset,
  output reg [2:0] light  // {red, yellow, green}
);
  localparam GREEN = 2'd0, YELLOW = 2'd1, RED = 2'd2;
  reg [1:0] state;
  reg [3:0] timer;

  // TODO: implement the FSM
  // GREEN for 10 cycles, YELLOW for 3 cycles, RED for 10 cycles
endmodule
