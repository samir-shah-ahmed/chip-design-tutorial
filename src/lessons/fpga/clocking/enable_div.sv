module enable_div #(parameter N = 4) (
  input clk,
  input rst,
  output reg ce
);
  reg [7:0] count;
  always @(posedge clk) begin
    if (rst) begin
      count <= 0;
      ce <= 1'b0;
    end else begin
      // TODO: pulse ce high for exactly one clock every N cycles.
      ce <= 1'b0;
      count <= count + 1'b1;
    end
  end
endmodule
