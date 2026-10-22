module hsync_gen #(parameter H_SYNC = 2, parameter H_TOTAL = 8) (
  input clk,
  input rst_n,
  output [3:0] x,
  output hsync
);
  reg [3:0] x_q;
  always @(posedge clk or negedge rst_n) begin
    if (!rst_n) x_q <= 0;
    else if (x_q == H_TOTAL - 1) x_q <= 0;
    else x_q <= x_q + 1'b1;
  end
  assign x = x_q;
  // TODO: hsync high while x < H_SYNC. Polarity on a real panel may be the opposite.
  assign hsync = 1'b0;
endmodule
