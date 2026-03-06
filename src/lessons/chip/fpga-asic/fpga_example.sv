// How would this map to FPGA resources?
// Count the LUTs and flip-flops needed.
module fpga_example(
  input        clk, reset,
  input  [3:0] a, b,
  input        sel,
  output reg [3:0] result
);
  wire [3:0] sum = a + b;  // needs LUTs for addition
  wire [3:0] mux = sel ? a : b;  // needs LUTs for each bit mux

  always @(posedge clk) begin  // needs 4 flip-flops
    if (reset)
      result <= 4'b0;
    else
      result <= sum & mux;  // needs LUTs for AND
  end
endmodule
