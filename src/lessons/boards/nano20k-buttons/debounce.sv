module debounce #(parameter STABLE = 3) (
  input clk,
  input rst_n,
  input btn_n,
  output reg pressed
);
  reg s0, s1;
  reg [7:0] count;
  always @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      s0 <= 1'b1;
      s1 <= 1'b1;
      count <= 0;
      pressed <= 1'b0;
    end else begin
      s0 <= btn_n;
      s1 <= s0;
      // TODO: count consecutive lows on s1. Set pressed after STABLE lows.
      pressed <= 1'b0;
      count <= 0;
    end
  end
endmodule
